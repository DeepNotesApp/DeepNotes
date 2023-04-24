import type { dataHashes } from '@deeplib/data';
import type { DataAbstraction } from '@stdlib/data';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    initialPageId: z.string().refine(isNanoID),
  }),
);

export const getCurrentPathProcedure = once(() =>
  baseProcedure.query(getCurrentPath),
);

export async function getCurrentPath({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  // Check if page exists

  if (
    (await ctx.dataAbstraction.hget('page', input.initialPageId, 'group-id')) ==
    null
  ) {
    throw new TRPCError({
      message: 'This page does not exist.',
      code: 'NOT_FOUND',
    });
  }

  // Get personal group ID

  const personalGroupId = await ctx.dataAbstraction.hget(
    'user',
    ctx.userId,
    'personal-group-id',
  );

  // Get main page ID of personal group

  const mainPageId = await ctx.dataAbstraction.hget(
    'group',
    personalGroupId,
    'main-page-id',
  );

  // Try to get that path page IDs

  const pathPageIds = await _getPathPageIds({
    userId: ctx.userId,
    initialPageId: input.initialPageId,
    mainPageId,
    dataAbstraction: ctx.dataAbstraction,
  });

  if (pathPageIds != null) {
    return pathPageIds;
  }

  // Failed to get path page IDs, fix parent ID and try again

  const startingPageId = await ctx.dataAbstraction.hget(
    'user',
    ctx.userId,
    'starting-page-id',
  );

  if (input.initialPageId === startingPageId) {
    await ctx.dataAbstraction.patch(
      'user-page',
      `${ctx.userId}:${input.initialPageId}`,
      { last_parent_id: mainPageId },
    );
  } else {
    await ctx.dataAbstraction.patch(
      'user-page',
      `${ctx.userId}:${input.initialPageId}`,
      { last_parent_id: startingPageId },
    );
  }

  // Try to get path page IDs again

  return (await _getPathPageIds({
    userId: ctx.userId,
    initialPageId: input.initialPageId,
    mainPageId,
    dataAbstraction: ctx.dataAbstraction,
  }))!;
}

async function _getPathPageIds(input: {
  userId: string;
  initialPageId: string;
  mainPageId: string;
  dataAbstraction: DataAbstraction<typeof dataHashes>;
}): Promise<string[] | undefined> {
  const pathPageIds: string[] = [];

  const visitedPageIds = new Set();

  let pathPageId: string | null = input.initialPageId;

  while (pathPageId != null) {
    if (visitedPageIds.has(pathPageId)) {
      return;
    }

    visitedPageIds.add(pathPageId);

    pathPageIds.unshift(pathPageId);

    if (pathPageId === input.mainPageId) {
      return pathPageIds;
    }

    const lastParentId = await input.dataAbstraction.hget(
      'user-page',
      `${input.userId}:${pathPageId}`,
      'last-parent-id',
    );

    pathPageId = lastParentId ?? null;
  }
}
