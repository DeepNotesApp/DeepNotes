import { w3cEmailRegex } from '@stdlib/misc';
import { once } from 'lodash';
import type { Context } from 'src/trpc/context';
import { publicProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

import { registrationSchema } from '../users/register';

const procedureSchema = z.object({
  email: z
    .string()
    .regex(w3cEmailRegex)
    .or(z.string().refine((email) => email === 'demo'))
    .transform((email) =>
      (process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
        .split(';')
        .includes(email)
        ? email
        : email.toLowerCase(),
    ),
  loginHash: z.instanceof(Uint8Array),
  rememberSession: z.boolean(),

  authenticatorToken: z.string().optional(),
  rememberDevice: z.boolean().optional(),

  recoveryCode: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional(),

  demo: registrationSchema().optional(),
});

export const loginProcedure = once(() =>
  publicProcedure.input(procedureSchema).mutation((opts) => login(opts)),
);

export async function login({
  ctx,
  input,
}: {
  ctx: Context;
  input: z.output<typeof procedureSchema>;
}) {
  //
}
