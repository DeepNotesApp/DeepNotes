import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { addHours, w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import type { PasswordValues } from 'src/crypto';
import { derivePasswordValues, encryptUserRehashedLoginHash } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { createGroup } from 'src/utils/groups';
import { userRegistrationSchema } from 'src/utils/users';
import { z } from 'zod';

export type RegistrationSchema = z.output<
  ReturnType<typeof userRegistrationSchema>
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
    .merge(userRegistrationSchema()),
);

export const registerProcedure = once(() => baseProcedure.mutation(register));

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

    await registerUser({
      ...input,

      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'] ?? '',

      passwordValues: derivePasswordValues(input.loginHash),

      dtrx,
    });
  });
}

export async function registerUser(
  input: {
    ip: string;
    userAgent: string;

    demo?: boolean;

    email: string;

    passwordValues: PasswordValues;

    dtrx?: DataTransaction;
  } & RegistrationSchema,
) {
  const emailVerificationCode = nanoid();

  await UserModel.query(input.dtrx?.trx)
    .where('email_hash', Buffer.from(hashUserEmail(input.email)))
    .delete();

  const userModel = {
    id: input.userId,

    encrypted_email: encryptUserEmail(input.email),
    email_hash: hashUserEmail(input.email),

    encrypted_rehashed_login_hash: input.demo
      ? new Uint8Array()
      : encryptUserRehashedLoginHash(
          encodePasswordHash(
            input.passwordValues.hash,
            input.passwordValues.salt,
            2,
            32,
          ),
        ),

    demo: !!input.demo,

    email_verified: false,
    ...(!input.demo
      ? {
          encrypted_new_email: encryptUserEmail(input.email),
          email_verification_code: emailVerificationCode,
          email_verification_expiration_date: addHours(new Date(), 1),
        }
      : {}),

    personal_group_id: input.groupId,

    starting_page_id: input.pageId,
    recent_page_ids: [input.pageId],
    recent_group_ids: [input.groupId],

    public_keyring: input.userPublicKeyring,
    encrypted_private_keyring: createPrivateKeyring(
      input.userEncryptedPrivateKeyring,
    ).wrapSymmetric(input.passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId: input.userId,
      },
    }).wrappedValue,
    encrypted_symmetric_keyring: createSymmetricKeyring(
      input.userEncryptedSymmetricKeyring,
    ).wrapSymmetric(input.passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId: input.userId,
      },
    }).wrappedValue,

    encrypted_name: input.userEncryptedName,
    encrypted_default_note: input.userEncryptedDefaultNote,
    encrypted_default_arrow: input.userEncryptedDefaultArrow,
  } as UserModel;

  await dataAbstraction().insert('user', input.userId, userModel, {
    dtrx: input.dtrx,
  });

  await createGroup({
    userId: input.userId,

    groupId: input.groupId,

    groupIsPersonal: true,
    groupMainPageId: input.pageId,

    groupIsPublic: false,

    groupAccessKeyring: input.groupEncryptedAccessKeyring,
    groupEncryptedInternalKeyring: input.groupEncryptedInternalKeyring,
    groupEncryptedContentKeyring: input.groupEncryptedContentKeyring,

    groupPublicKeyring: input.groupPublicKeyring,
    groupEncryptedPrivateKeyring: input.groupEncryptedPrivateKeyring,

    dtrx: input.dtrx,
  });

  await dataAbstraction().insert(
    'page',
    input.pageId,
    {
      id: input.pageId,

      encrypted_symmetric_keyring: input.pageEncryptedSymmetricKeyring,

      encrypted_relative_title: input.pageEncryptedRelativeTitle,
      encrypted_absolute_title: input.pageEncryptedAbsoluteTitle,

      group_id: input.groupId,

      free: true,
    },
    { dtrx: input.dtrx },
  );

  await dataAbstraction().insert(
    'user-page',
    `${input.userId}:${input.pageId}`,
    {
      user_id: input.userId,
      page_id: input.pageId,
    },
    { dtrx: input.dtrx },
  );

  return userModel;
}
