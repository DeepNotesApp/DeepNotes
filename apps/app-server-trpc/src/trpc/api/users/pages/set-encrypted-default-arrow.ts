import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(z.instanceof(Uint8Array));

export const setEncryptedDefaultArrowProcedure = once(() =>
  baseProcedure.mutation(setEncryptedDefaultArrow),
);

export async function setEncryptedDefaultArrow({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  await ctx.dataAbstraction.patch('user', ctx.userId, {
    encrypted_default_arrow: input,
  });
}
