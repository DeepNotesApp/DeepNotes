import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { authenticator } from 'otplib';
import { encryptUserAuthenticatorSecret } from 'src/crypto';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { checkCorrectUserPassword } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const requestProcedure = once(() => baseProcedure.mutation(request));

export async function request({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Check correct password

        await checkCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.loginHash,
        });

        // Check if two-factor authentication is already enabled

        if (
          await ctx.dataAbstraction.hget(
            'user',
            ctx.userId,
            'two-factor-auth-enabled',
          )
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Two factor authentication is already enabled.',
          });
        }

        // Generate a new authenticator secret

        const authenticatorSecret = authenticator.generateSecret();

        await ctx.dataAbstraction.patch(
          'user',
          ctx.userId,
          {
            encrypted_authenticator_secret:
              encryptUserAuthenticatorSecret(authenticatorSecret),
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);

        return {
          secret: authenticatorSecret,
          keyUri: authenticator.keyuri(
            await ctx.dataAbstraction.hget('user', ctx.userId, 'email'),
            'DeepNotes',
            authenticatorSecret,
          ),
        };
      });
    },
  );
}
