import { UserModel } from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { ref } from 'objection';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = publicProcedure.input(
  z.object({
    emailVerificationCode: z.string().refine(isNanoID),
  }),
);

export const verifyEmailProcedure = once(() =>
  baseProcedure.mutation(verifyEmail),
);

export async function verifyEmail({
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  if (
    (await UserModel.query()
      .whereNot('email_verified', true)
      .where('email_verification_code', input.emailVerificationCode)
      .where('email_verification_expiration_date', '>', new Date())
      .patch({
        encrypted_email: ref('encrypted_new_email'),
        encrypted_new_email: null,
        email_verified: true,
        email_verification_code: null,
        email_verification_expiration_date: null,
      })) !== 1
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid email verification code.',
    });
  }
}
