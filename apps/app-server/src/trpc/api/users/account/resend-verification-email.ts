import { hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

import { sendRegistrationEmail } from './register';

const baseProcedure = publicProcedure.input(
  z.object({
    email: z
      .string()
      .regex(w3cEmailRegex)
      .transform((email) => email.toLowerCase()),
  }),
);

export const resendVerificationEmailProcedure = once(() =>
  baseProcedure.mutation(resendVerificationEmail),
);

export async function resendVerificationEmail({
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  // Get user

  const user = await UserModel.query()
    .where('email_hash', Buffer.from(hashUserEmail(input.email)))
    .select('email_verified', 'email_verification_code')
    .first();

  // Check if user already exists

  if (user == null) {
    throw new TRPCError({
      message: 'User not found.',
      code: 'NOT_FOUND',
    });
  }

  // User already exists, check if email is verified

  if (user.email_verified) {
    throw new TRPCError({
      message: 'Email already registered.',
      code: 'CONFLICT',
    });
  }

  // Send email

  await sendRegistrationEmail({
    email: input.email,
    emailVerificationCode: user.email_verification_code,
  });
}
