import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { encryptRecoveryCodes, hashRecoveryCode } from 'src/utils/crypto';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const generateRecoveryCodesProcedure = once(() =>
  baseProcedure.mutation(generateRecoveryCodes),
);

export async function generateRecoveryCodes({
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

        // Generate recovery codes

        const recoveryCodes = Array(6)
          .fill(null)
          .map(() => sodium.to_hex(sodium.randombytes_buf(16)));
        // Save recovery codes

        await ctx.dataAbstraction.patch(
          'user',
          ctx.userId,
          {
            encrypted_recovery_codes: encryptRecoveryCodes(
              recoveryCodes.map((recoveryCode) =>
                hashRecoveryCode(recoveryCode),
              ),
            ),
          },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);

        return recoveryCodes;
      });
    },
  );
}
