import { insertPageSnapshot } from '@deeplib/data';
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
          return await ctx.dataAbstraction.transaction(async (dtrx) => {
            // Check if user has sufficient permissions

            if (
              !(await ctx.userHasPermission(
                ctx.userId,
                groupId,
                'editGroupPages',
              ))
            ) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Insufficient permissions.',
              });
            }

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
      );
    },
  );
}
