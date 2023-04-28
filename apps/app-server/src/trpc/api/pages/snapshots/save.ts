import { insertPageSnapshot } from '@deeplib/data';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { assertUserSubscribed } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),

    encryptedSymmetricKey: z.instanceof(Uint8Array),
    encryptedData: z.instanceof(Uint8Array),

    preRestore: z.boolean().optional(),
  }),
);

export const saveProcedure = once(() => baseProcedure.mutation(save));

export async function save({
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
          return await ctx.dataAbstraction.transaction(async (dtrx) => {
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

            // Save snapshot

            await insertPageSnapshot({
              dataAbstraction: ctx.dataAbstraction,

              pageId: input.pageId,
              authorId: ctx.userId,

              encryptedSymmetricKey: input.encryptedSymmetricKey,
              encryptedData: input.encryptedData,

              type: input.preRestore ? 'pre-restore' : 'manual',

              dtrx,
            });

            checkRedlockSignalAborted(signals);
          });
        },
        signals,
      );
    },
  );
}
