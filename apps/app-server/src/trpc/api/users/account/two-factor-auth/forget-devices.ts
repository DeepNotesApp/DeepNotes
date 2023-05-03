import { DeviceModel } from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const forgetTrustedDevicesProcedure = once(() =>
  baseProcedure.mutation(forgetTrustedDevices),
);

export async function forgetTrustedDevices({
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

        // Forget all devices

        await DeviceModel.query(dtrx.trx)
          .where('user_id', ctx.userId)
          .patch({ trusted: false });

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
