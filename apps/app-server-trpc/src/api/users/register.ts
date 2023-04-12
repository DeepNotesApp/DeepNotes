import { hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { isNanoID, w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { createUser } from 'src/utils';
import { z } from 'zod';

export const registrationSchema = once(() =>
  z.object({
    userId: z.string().refine(isNanoID),
    groupId: z.string().refine(isNanoID),
    pageId: z.string().refine(isNanoID),

    userPublicKeyring: z.instanceof(Uint8Array),
    userEncryptedPrivateKeyring: z.instanceof(Uint8Array),
    userEncryptedSymmetricKeyring: z.instanceof(Uint8Array),

    userEncryptedName: z.instanceof(Uint8Array),
    userEncryptedDefaultNote: z.instanceof(Uint8Array),
    userEncryptedDefaultArrow: z.instanceof(Uint8Array),

    groupEncryptedAccessKeyring: z.instanceof(Uint8Array),
    groupEncryptedInternalKeyring: z.instanceof(Uint8Array),
    groupEncryptedContentKeyring: z.instanceof(Uint8Array),

    groupPublicKeyring: z.instanceof(Uint8Array),
    groupEncryptedPrivateKeyring: z.instanceof(Uint8Array),

    pageEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
    pageEncryptedRelativeTitle: z.instanceof(Uint8Array),
    pageEncryptedAbsoluteTitle: z.instanceof(Uint8Array),
  }),
);

export type RegistrationSchema = z.output<
  ReturnType<typeof registrationSchema>
>;

const baseProcedure = publicProcedure.input(
  z
    .object({
      email: z
        .string()
        .regex(w3cEmailRegex)
        .transform((email) => email.toLowerCase()),
      loginHash: z.instanceof(Uint8Array),
    })
    .merge(registrationSchema()),
);

export const registerProcedure = once(() =>
  baseProcedure.mutation(async (opts) => register(opts)),
);

export async function register({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Get user

    const user = await UserModel.query()
      .where('email_hash', Buffer.from(hashUserEmail(input.email)))
      .where((builder) =>
        builder
          .where('email_verified', true)
          .orWhere('email_verification_expiration_date', '>', new Date()),
      )
      .select('email_verified')
      .first();

    // Check if user already exists

    if (user != null) {
      // User already exists, check if email is verified

      if (user.email_verified) {
        throw new TRPCError({
          message: 'Email already registered.',
          code: 'CONFLICT',
        });
      } else {
        throw new TRPCError({
          message: 'Email awaiting verification.',
          code: 'CONFLICT',
        });
      }
    }

    // Create user

    await createUser({
      ...input,

      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'] ?? '',

      dtrx,
    });
  });
}
