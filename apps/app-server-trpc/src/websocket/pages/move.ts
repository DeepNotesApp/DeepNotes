import { getAllPageUpdates, hget } from '@deeplib/data';
import { PageSnapshotModel, PageUpdateModel } from '@deeplib/db';
import { patchMultiple } from '@stdlib/db';
import {
  allAsyncProps,
  isNanoID,
  objEntries,
  objFromEntries,
} from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import { getRedis } from 'src/data/redis';
import type {
  InferProcedureContext,
  InferProcedureInput,
  InferProcedureOpts,
} from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { bumpRecentItem } from 'src/utils';
import { createGroup, groupCreationSchema } from 'src/utils/groups';
import { pageKeyRotationSchema } from 'src/utils/pages';
import { checkUserSubscription } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),

    destGroupId: z.string().refine(isNanoID),
    setAsMainPage: z.boolean(),

    groupCreation: groupCreationSchema().optional(),
  }),
);
export const moveProcedureStep1 = baseProcedureStep1.mutation(moveStep1);

const baseProcedureStep2 = authProcedure.input(pageKeyRotationSchema());
export const moveProcedureStep2 = baseProcedureStep2.mutation(moveStep2);

interface Context extends InferProcedureContext<typeof baseProcedureStep1> {
  pageId: string;

  sourceGroupId: string;
  destGroupId: string;
  setAsMainPage: boolean;
}

export function registerPagesMove(fastify: ReturnType<typeof Fastify>) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/pages.move',

    async setup({ messageHandler, ctx, input }) {
      (ctx as Context).pageId = input.pageId;
      (ctx as Context).destGroupId = input.destGroupId;
      (ctx as Context).setAsMainPage = input.setAsMainPage;

      return await ctx.usingLocks(
        [[`page-lock:${input.pageId}`]],
        async (signals) => {
          // Get source group ID

          const sourceGroupId = await ctx.dataAbstraction.hget(
            'page',
            input.pageId,
            'group-id',
          );

          (ctx as Context).sourceGroupId = sourceGroupId;

          checkRedlockSignalAborted(signals);

          return await ctx.usingLocks(
            [
              [`group-lock:${sourceGroupId}`],
              [`group-lock:${input.destGroupId}`],
            ],
            async (signals) => {
              messageHandler.redlockSignals.push(...signals);

              await messageHandler.finishPromise;
            },
          );
        },
      );
    },

    procedures: [
      [moveProcedureStep1, moveStep1],
      [moveProcedureStep2, moveStep2],
    ],
  });
}

export async function moveStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Check sufficient permissions

    const [canEditSourceGroupSettings, canEditDestGroupPages] =
      await Promise.all([
        ctx.userHasPermission(
          ctx.userId,
          (ctx as Context).sourceGroupId,
          'editGroupSettings',
        ),
        ctx.userHasPermission(ctx.userId, input.destGroupId, 'editGroupPages'),
      ]);

    if (
      !canEditSourceGroupSettings ||
      (input.groupCreation == null && !canEditDestGroupPages)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
      });
    }

    // Check user subscription

    await checkUserSubscription({
      userId: ctx.userId,
      dataAbstraction: ctx.dataAbstraction,
    });

    // Check if page is main page of source group

    if (
      input.pageId ===
      (await ctx.dataAbstraction.hget(
        'group',
        (ctx as Context).sourceGroupId,
        'main-page-id',
      ))
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Cannot move main page of a group. Please set another page as main page first.',
      });
    }

    // Create group if requested

    if (input.groupCreation != null) {
      await createGroup({
        userId: ctx.userId,

        groupId: input.destGroupId,
        groupMainPageId: input.pageId,
        groupIsPersonal: false,

        ...input.groupCreation,

        dtrx,
      });
    }

    return await allAsyncProps({
      pageEncryptedRelativeTitle: (async () =>
        await ctx.dataAbstraction.hget(
          'page',
          input.pageId,
          'encrypted-relative-title',
        ))(),
      pageEncryptedAbsoluteTitle: (async () =>
        await ctx.dataAbstraction.hget(
          'page',
          input.pageId,
          'encrypted-absolute-title',
        ))(),

      pageEncryptedUpdates: (async () =>
        (
          await getAllPageUpdates(input.pageId, getRedis())
        ).map((pageUpdate) => pageUpdate[1]))(),
      pageEncryptedSnapshots: (async () =>
        objFromEntries(
          (
            await PageSnapshotModel.query()
              .where('page_id', input.pageId)
              .select('id', 'encrypted_symmetric_key', 'encrypted_data')
              .orderBy('id')
          ).map(({ id, encrypted_symmetric_key, encrypted_data }) => [
            id,
            {
              encryptedSymmetricKey: encrypted_symmetric_key,
              encryptedData: encrypted_data,
            },
          ]),
        ))(),
    });
  });
}

export async function moveStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Set page as main page of destination group

    if ((ctx as Context).setAsMainPage) {
      const [destGroupOldMainPageId, destGroupMemberId] =
        await ctx.dataAbstraction.mhget([
          hget('group', (ctx as Context).destGroupId, 'main-page-id'),
          hget('group', (ctx as Context).destGroupId, 'user-id'),
        ]);

      const oldLastParentId = await ctx.dataAbstraction.hget(
        'user-page',
        `${ctx.userId}:${destGroupOldMainPageId}`,
        'last-parent-id',
      );

      // Replacing main page of personal group
      // Update last parent IDs of relevant pages

      if (
        ctx.userId === destGroupMemberId &&
        (ctx as Context).pageId !== destGroupOldMainPageId
      ) {
        await ctx.dataAbstraction.patch(
          'user-page',
          `${ctx.userId}:${(ctx as Context).pageId}`,
          { last_parent_id: oldLastParentId },
          { dtrx },
        );

        await ctx.dataAbstraction.patch(
          'user-page',
          `${ctx.userId}:${destGroupOldMainPageId}`,
          { last_parent_id: (ctx as Context).pageId },
          { dtrx },
        );
      }

      // Set page as main page of destination group

      await ctx.dataAbstraction.patch(
        'group',
        (ctx as Context).destGroupId,
        { main_page_id: (ctx as Context).pageId },
        { dtrx },
      );
    }

    // Moving page to a different group, reencrypt all page data

    if ((ctx as Context).sourceGroupId !== (ctx as Context).destGroupId) {
      await ctx.dataAbstraction.patch(
        'page',
        (ctx as Context).pageId,
        {
          group_id: (ctx as Context).destGroupId,
          encrypted_symmetric_keyring: input.pageEncryptedSymmetricKeyring,
          encrypted_relative_title: input.pageEncryptedRelativeTitle,
          encrypted_absolute_title: input.pageEncryptedAbsoluteTitle,
        },
        { dtrx },
      );

      await patchMultiple(
        'page_snapshots',

        ['id', 'encrypted_symmetric_key', 'encrypted_data'],
        ['char(21)', 'bytea', 'bytea'],
        objEntries(input.pageEncryptedSnapshots).map(
          ([snapshotId, { encryptedSymmetricKey, encryptedData }]) => [
            snapshotId,
            encryptedSymmetricKey,
            encryptedData,
          ],
        ),

        'page_snapshots.id = values.id',
        `encrypted_symmetric_key = values.encrypted_symmetric_key,
         encrypted_data = values.encrypted_data`,
        { trx: dtrx.trx },
      );

      await PageUpdateModel.query(dtrx.trx)
        .where('page_id', (ctx as Context).pageId)
        .delete();
      await PageUpdateModel.query(dtrx.trx).insert({
        page_id: (ctx as Context).pageId,
        index: 0,
        encrypted_data: input.pageEncryptedUpdate,
      });

      await bumpRecentItem({
        userId: ctx.userId,

        itemType: 'group',
        itemId: (ctx as Context).destGroupId,

        dataAbstraction: ctx.dataAbstraction,
        dtrx,
      });

      ctx.dataAbstraction.addToTransaction(dtrx, () =>
        getRedis().del(
          `page-update-index:{${(ctx as Context).pageId}}`,
          `page-update-cache:{${(ctx as Context).pageId}}`,
          `page-update-buffer:{${(ctx as Context).pageId}}`,
          `page-awareness-buffer:{${(ctx as Context).pageId}}`,
        ),
      );
    }
  });
}
