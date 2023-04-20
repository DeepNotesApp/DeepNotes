import type { dataHashes } from '@deeplib/data';
import { GroupMemberModel, PageLinkModel, PageModel } from '@deeplib/db';
import type { DataAbstraction } from '@stdlib/data';
import { isNanoID, mainLogger } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once, pull } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { bumpRecentItem } from 'src/utils';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),

    parentPageId: z.string().refine(isNanoID).optional(),
  }),
);

export const bumpProcedure = once(() => baseProcedure.mutation(bump));

export async function bump({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  const groupId = await ctx.dataAbstraction.hget(
    'page',
    input.pageId,
    'group-id',
  );

  await Promise.all([
    _updateStartingPageId({
      userId: ctx.userId,
      pageId: input.pageId,
      dataAbstraction: ctx.dataAbstraction,
    }),
    _updateLastParentId({
      userId: ctx.userId,
      pageId: input.pageId,
      parentPageId: input.parentPageId,
      dataAbstraction: ctx.dataAbstraction,
    }),

    _updatePageLink({
      pageId: input.pageId,
      parentPageId: input.parentPageId,
    }),
    _updatePageBacklinks({
      pageId: input.pageId,
      parentPageId: input.parentPageId,
      dataAbstraction: ctx.dataAbstraction,
    }),

    _updateRecentPageIds({
      userId: ctx.userId,
      pageId: input.pageId,
      dataAbstraction: ctx.dataAbstraction,
    }),
    _updateRecentGroupIds({
      userId: ctx.userId,
      groupId,
      dataAbstraction: ctx.dataAbstraction,
    }),

    _updatePageLastActivityDate({
      pageId: input.pageId,
    }),
    _updateGroupLastActivityDate({
      userId: ctx.userId,
      groupId,
    }),
  ]);
}

async function _updateStartingPageId(input: {
  userId: string;
  pageId: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}) {
  await input.dataAbstraction.patch('user', input.userId, {
    starting_page_id: input.pageId,
  });
}
async function _updateLastParentId(input: {
  userId: string;
  pageId: string;
  parentPageId?: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}) {
  if (input.parentPageId == null) {
    return;
  }

  // Check for loop in parent chain

  const visitedPageIds = new Set<string>([input.pageId]);

  let loopCheckPageId: string | undefined = input.parentPageId;
  let rootPageId: string | undefined;

  while (loopCheckPageId != null) {
    if (visitedPageIds.has(loopCheckPageId)) {
      mainLogger.sub('api/pages/bump').info('Loop detected in parent chain');
      return;
    }

    visitedPageIds.add(loopCheckPageId);

    rootPageId = loopCheckPageId;

    loopCheckPageId =
      (await input.dataAbstraction.hget(
        'user-page',
        `${input.userId}:${loopCheckPageId}`,
        'last-parent-id',
      )) ?? undefined;
  }

  mainLogger.sub('api/pages/bump').info('No loop detected in parent chain');

  // Check that root page is personal group's main page

  const personalGroupId = await input.dataAbstraction.hget(
    'user',
    input.userId,
    'personal-group-id',
  );

  const mainPageId = await input.dataAbstraction.hget(
    'group',
    personalGroupId,
    'main-page-id',
  );

  if (rootPageId !== mainPageId) {
    throw new TRPCError({
      message: 'Invalid parent page.',
      code: 'BAD_REQUEST',
    });
  }

  // Update last_parent_id

  await input.dataAbstraction.patch(
    'user-page',
    `${input.userId}:${input.pageId}`,
    { last_parent_id: input.parentPageId },
  );
}

async function _updatePageLink(input: {
  pageId: string;
  parentPageId?: string;
}) {
  if (input.parentPageId == null) {
    return;
  }

  try {
    await PageLinkModel.query()
      .insert({
        target_page_id: input.pageId,
        source_page_id: input.parentPageId,

        last_activity_date: new Date(),
      })
      .onConflict(['source_page_id', 'target_page_id'])
      .merge();
  } catch (error) {
    // Ignore error: Page doesn't need to exist
  }
}
async function _updatePageBacklinks(input: {
  pageId: string;
  parentPageId?: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}) {
  if (input.parentPageId == null) {
    return;
  }

  const pageBacklinks: string[] = await input.dataAbstraction.hget(
    'page-backlinks',
    input.pageId,
    'list',
  );

  // Prepend page ID to backlinks

  pull(pageBacklinks, input.parentPageId);
  pageBacklinks.splice(0, 0, input.parentPageId);

  while (pageBacklinks.length > 100) {
    pageBacklinks.pop();
  }

  // Update backlinks

  await input.dataAbstraction.hmset('page-backlinks', input.pageId, {
    list: pageBacklinks,
  });
}

async function _updateRecentPageIds(input: {
  userId: string;
  pageId: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}) {
  await bumpRecentItem({
    userId: input.userId,
    itemType: 'page',
    itemId: input.pageId,
    dataAbstraction: input.dataAbstraction,
  });
}
async function _updateRecentGroupIds(input: {
  userId: string;
  groupId: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}) {
  if (input.groupId == null) {
    return;
  }

  await bumpRecentItem({
    userId: input.userId,
    itemType: 'group',
    itemId: input.groupId,
    dataAbstraction: input.dataAbstraction,
  });
}

async function _updatePageLastActivityDate(input: { pageId: string }) {
  try {
    await PageModel.query().findById(input.pageId).patch({
      last_activity_date: new Date(),
    });
  } catch (error) {
    // Ignore error: Page doesn't need to exist
  }
}
async function _updateGroupLastActivityDate(input: {
  userId: string;
  groupId: string;
}) {
  if (input.groupId == null) {
    return;
  }

  try {
    await GroupMemberModel.query()
      .findById([input.groupId, input.userId])
      .patch({
        last_activity_date: new Date(),
      });
  } catch (error) {
    // Ignore error: Page doesn't need to exist
  }
}
