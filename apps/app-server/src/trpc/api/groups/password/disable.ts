import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { assertCorrectGroupPassword } from 'src/utils/groups';
import { assertUserSubscribed } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    groupPasswordHash: z.instanceof(Uint8Array),

    groupEncryptedContentKeyring: z.instanceof(Uint8Array),
  }),
);

export const disableProcedure = once(() => baseProcedure.mutation(disable));

export async function disable({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Assert agent is subscribed

        await assertUserSubscribed({
          userId: ctx.userId,
          dataAbstraction: ctx.dataAbstraction,
        });

        // Check if given group password is correct

        await assertCorrectGroupPassword({
          groupId: input.groupId,
          groupPasswordHash: input.groupPasswordHash,
        });

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

        // Disable password protection

        await ctx.dataAbstraction.patch(
          'group',
          input.groupId,
          {
            encrypted_rehashed_password_hash: null,

            encrypted_content_keyring: input.groupEncryptedContentKeyring,
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
