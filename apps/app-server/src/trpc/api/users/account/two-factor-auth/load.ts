import { decryptUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { authenticator } from 'otplib';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { decryptUserAuthenticatorSecret } from 'src/utils/crypto';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const loadProcedure = once(() => baseProcedure.query(load));

export async function load({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Assert correct password

      await ctx.assertCorrectUserPassword({
        userId: ctx.userId,
        loginHash: input.loginHash,
      });

      // Get user data

      const user = await UserModel.query().findById(ctx.userId).select(
        'two_factor_auth_enabled',
        'encrypted_authenticator_secret',

        'encrypted_email',
      );

      checkRedlockSignalAborted(signals);

      if (user == null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User not found.',
        });
      }

      // Check if two-factor authentication is enabled

      if (
        !user.two_factor_auth_enabled ||
        user.encrypted_authenticator_secret == null
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Two-factor authentication is not enabled.',
        });
      }

      // Decrypt authenticator secret

      const authenticatorSecret = decryptUserAuthenticatorSecret(
        user.encrypted_authenticator_secret,
      );

      // Return 2FA infos

      return {
        secret: authenticatorSecret,
        keyUri: authenticator.keyuri(
          decryptUserEmail(user.encrypted_email),
          'DeepNotes',
          authenticatorSecret,
        ),
      };
    },
  );
}
