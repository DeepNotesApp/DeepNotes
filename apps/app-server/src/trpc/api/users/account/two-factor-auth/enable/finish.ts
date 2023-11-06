import { UserModel } from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers-sumo';
import { once } from 'lodash';
import { authenticator } from 'otplib';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import {
  decryptUserAuthenticatorSecret,
  encryptRecoveryCodes,
  hashRecoveryCode,
} from 'src/utils/crypto';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
    authenticatorToken: z.string().regex(/^\d{6}$/),
  }),
);

export const finishProcedure = once(() => baseProcedure.mutation(finish));

export async function finish({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Assert correct password

        await ctx.assertCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.loginHash,
        });

        // Get authenticator secret from the database.

        const user = await UserModel.query()
          .findById(ctx.userId)
          .select('encrypted_authenticator_secret');

        if (user == null) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User not found.',
          });
        }

        // Check if two-factor authentication is enabled

        if (user.encrypted_authenticator_secret == null) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Two-factor authentication is not enabled.',
          });
        }

        // Decrypt authenticator secret

        const authenticatorSecret = decryptUserAuthenticatorSecret(
          user.encrypted_authenticator_secret,
        );

        // Check if the authenticator token is correct

        if (
          !authenticator.check(input.authenticatorToken, authenticatorSecret)
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Authenticator token is incorrect.',
          });
        }

        // Generate recovery codes

        const recoveryCodes = Array(6)
          .fill(null)
          .map(() => sodium.to_hex(sodium.randombytes_buf(16)));

        // Enable two-factor authentication

        await ctx.dataAbstraction.patch(
          'user',
          ctx.userId,
          {
            two_factor_auth_enabled: true,
            encrypted_recovery_codes: encryptRecoveryCodes(
              recoveryCodes.map((recoveryCode) =>
                hashRecoveryCode(recoveryCode),
              ),
            ),
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);

        return { recoveryCodes };
      });
    },
  );
}
