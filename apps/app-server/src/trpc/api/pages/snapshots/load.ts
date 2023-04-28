import { PageSnapshotModel } from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { assertUserSubscribed } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),

    snapshotId: z.string().refine(isNanoID),
  }),
);

export const loadProcedure = once(() => baseProcedure.query(load));

export async function load({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`page-lock:${input.pageId}`]],
    async (signals) => {
      const groupId = await ctx.dataAbstraction.hget(
        'page',
        input.pageId,
        'group-id',
      );

      return await ctx.usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          // Assert agent is subscribed

          await assertUserSubscribed({
            userId: ctx.userId,
            dataAbstraction: ctx.dataAbstraction,
          });

          // Check if user has sufficient permissions

          await ctx.assertSufficientGroupPermissions({
            userId: ctx.userId,
            groupId: groupId,
            permission: 'editGroupPages',
          });

          // Load page snapshot infos

          const snapshot = await PageSnapshotModel.query()
            .findById(input.snapshotId)
            .select('encrypted_symmetric_key', 'encrypted_data');

          if (snapshot == null) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Snapshot not found.',
            });
          }

          checkRedlockSignalAborted(signals);

          return {
            encryptedSymmetricKey: snapshot.encrypted_symmetric_key,
            encryptedData: snapshot.encrypted_data,
          };
        },
        signals,
      );
    },
  );
}
