import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { checkCorrectUserPassword } from 'src/utils';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const disableProcedure = once(() => baseProcedure.mutation(disable));

export async function disable({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      await checkCorrectUserPassword({
        userId: ctx.userId,
        loginHash: input.loginHash,
      });

      checkRedlockSignalAborted(signals);

      // Check if two-factor authentication is enabled

      if (
        !(await ctx.dataAbstraction.hget(
          'user',
          ctx.userId,
          'two-factor-auth-enabled',
        ))
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Two factor authentication is not enabled.',
        });
      }

      checkRedlockSignalAborted(signals);

      // Disable two-factor authentication

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        two_factor_auth_enabled: false,
        encrypted_authenticator_secret: null,
        encrypted_recovery_codes: null,
      });
    },
  );
}
