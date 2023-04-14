import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { addHours, isNanoID, w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import type { PasswordValues } from 'src/crypto';
import { derivePasswordValues, encryptUserRehashedLoginHash } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { createGroup } from 'src/utils';
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

export async function registerUser({
  demo,

  email,

  userId,
  groupId,
  pageId,

  userPublicKeyring,
  userEncryptedPrivateKeyring,
  userEncryptedSymmetricKeyring,

  userEncryptedName,
  userEncryptedDefaultNote,
  userEncryptedDefaultArrow,

  groupEncryptedAccessKeyring,
  groupEncryptedInternalKeyring,
  groupEncryptedContentKeyring,

  groupPublicKeyring,
  groupEncryptedPrivateKeyring,

  pageEncryptedSymmetricKeyring,
  pageEncryptedRelativeTitle,
  pageEncryptedAbsoluteTitle,

  passwordValues,

  dtrx,
}: {
  ip: string;
  userAgent: string;

  demo?: boolean;

  email: string;

  passwordValues: PasswordValues;

  dtrx?: DataTransaction;
} & RegistrationSchema) {
  const emailVerificationCode = nanoid();

  await UserModel.query(dtrx?.trx)
    .where('email_hash', Buffer.from(hashUserEmail(email)))
    .delete();

  const userModel = {
    id: userId,

    encrypted_email: encryptUserEmail(email),
    email_hash: hashUserEmail(email),

    encrypted_rehashed_login_hash: demo
      ? new Uint8Array()
      : encryptUserRehashedLoginHash(
          encodePasswordHash(passwordValues.hash, passwordValues.salt, 2, 32),
        ),

    demo: !!demo,

    email_verified: false,
    ...(!demo
      ? {
          encrypted_new_email: encryptUserEmail(email),
          email_verification_code: emailVerificationCode,
          email_verification_expiration_date: addHours(new Date(), 1),
        }
      : {}),

    personal_group_id: groupId,

    starting_page_id: pageId,
    recent_page_ids: [pageId],
    recent_group_ids: [groupId],

    public_keyring: userPublicKeyring,
    encrypted_private_keyring: createPrivateKeyring(
      userEncryptedPrivateKeyring,
    ).wrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId,
      },
    }).wrappedValue,
    encrypted_symmetric_keyring: createSymmetricKeyring(
      userEncryptedSymmetricKeyring,
    ).wrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId,
      },
    }).wrappedValue,

    encrypted_name: userEncryptedName,
    encrypted_default_note: userEncryptedDefaultNote,
    encrypted_default_arrow: userEncryptedDefaultArrow,
  } as UserModel;

  await dataAbstraction().insert('user', userId, userModel, { dtrx });

  await createGroup({
    groupId: groupId,
    mainPageId: pageId,
    isPublic: false,
    isPersonal: true,

    userId: userId,

    accessKeyring: groupEncryptedAccessKeyring,
    encryptedInternalKeyring: groupEncryptedInternalKeyring,
    encryptedContentKeyring: groupEncryptedContentKeyring,

    publicKeyring: groupPublicKeyring,
    encryptedPrivateKeyring: groupEncryptedPrivateKeyring,

    dtrx,
  });

  await dataAbstraction().insert(
    'page',
    pageId,
    {
      id: pageId,

      encrypted_symmetric_keyring: pageEncryptedSymmetricKeyring,

      encrypted_relative_title: pageEncryptedRelativeTitle,
      encrypted_absolute_title: pageEncryptedAbsoluteTitle,

      group_id: groupId,

      free: true,
    },
    { dtrx },
  );

  await dataAbstraction().insert(
    'user-page',
    `${userId}:${pageId}`,
    {
      user_id: userId,
      page_id: pageId,
    },
    { dtrx },
  );

  return userModel;
}
