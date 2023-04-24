import { checkRedlockSignalAborted } from '@stdlib/redlock';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { encryptRecoveryCodes, hashRecoveryCode } from 'src/utils/crypto';
import { checkCorrectUserPassword } from 'src/utils/users';
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
        // Check correct password

        await checkCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.loginHash,
        });

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
