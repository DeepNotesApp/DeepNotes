import { PageSnapshotModel } from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
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
    [[`page-lock:${input.pageId}`]],
    async (signals) => {
      const groupId = await ctx.dataAbstraction.hget(
        'page',
        input.pageId,
        'group-id',
      );

      checkRedlockSignalAborted(signals);

      return await ctx.usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          // Check if user has sufficient permissions

          if (
            !(await ctx.userHasPermission(
              ctx.userId,
              groupId,
              'editGroupPages',
            ))
          ) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Insufficient permissions.',
            });
          }

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
      );
    },
  );
}
