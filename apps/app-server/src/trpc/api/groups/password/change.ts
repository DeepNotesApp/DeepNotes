import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import {
  computePasswordHash,
  encryptGroupRehashedPasswordHash,
} from 'src/utils/crypto';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    groupCurrentPasswordHash: z.instanceof(Uint8Array),
    groupNewPasswordHash: z.instanceof(Uint8Array),

    groupEncryptedContentKeyring: z.instanceof(Uint8Array),
  }),
);

export const changeProcedure = once(() => baseProcedure.mutation(change));

export async function change({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Assert agent is subscribed

        await ctx.assertUserSubscribed({ userId: ctx.userId });

        // Check if given group password is correct

        await ctx.assertCorrectGroupPassword({
          groupId: input.groupId,
          groupPasswordHash: input.groupCurrentPasswordHash,
        });

        // Check if user can edit group settings

        await ctx.assertSufficientGroupPermissions({
          userId: ctx.userId,
          groupId: input.groupId,
          permission: 'editGroupSettings',
        });

        // Check if group is password protected

        if (
          !(await ctx.dataAbstraction.hget(
            'group',
            input.groupId,
            'is-password-protected',
          ))
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This group is not password protected.',
          });
        }

        // Change group password

        await ctx.dataAbstraction.patch(
          'group',
          input.groupId,
          {
            encrypted_rehashed_password_hash: encryptGroupRehashedPasswordHash(
              computePasswordHash(input.groupNewPasswordHash),
            ),

            encrypted_content_keyring: input.groupEncryptedContentKeyring,
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
