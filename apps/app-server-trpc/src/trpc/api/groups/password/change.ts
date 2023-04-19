import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import {
  computePasswordHash,
  encryptGroupRehashedPasswordHash,
} from 'src/crypto';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { checkCorrectGroupPassword } from 'src/utils/groups';
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
    [[`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Check if given group password is correct

        await checkCorrectGroupPassword({
          groupId: input.groupId,
          groupPasswordHash: input.groupCurrentPasswordHash,
        });

        checkRedlockSignalAborted(signals);

        // Check if user can edit group settings

        if (
          !(await ctx.userHasPermission(
            ctx.userId,
            input.groupId,
            'editGroupSettings',
          ))
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions.',
          });
        }

        checkRedlockSignalAborted(signals);

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

        checkRedlockSignalAborted(signals);

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
