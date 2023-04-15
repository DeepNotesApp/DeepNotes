import { decryptUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { authenticator } from 'otplib';
import { decryptUserAuthenticatorSecret } from 'src/crypto';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { checkCorrectUserPassword } from 'src/utils';
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
      await checkCorrectUserPassword({
        userId: ctx.userId,
        loginHash: input.loginHash,
      });

      checkRedlockSignalAborted(signals);

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

      if (
        !user.two_factor_auth_enabled ||
        user.encrypted_authenticator_secret == null
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Two-factor authentication is not enabled.',
        });
      }

      const authenticatorSecret = decryptUserAuthenticatorSecret(
        user.encrypted_authenticator_secret,
      );

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
