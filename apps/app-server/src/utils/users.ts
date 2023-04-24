import type { dataHashes } from '@deeplib/data';
import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { getPasswordHashValues } from '@stdlib/crypto';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type { DataAbstraction } from '@stdlib/data';
import type { DataTransaction } from '@stdlib/data';
import { isNanoID } from '@stdlib/misc';
import { addHours } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import { dataAbstraction } from 'src/data/data-abstraction';
import type { PasswordValues } from 'src/utils/crypto';
import { decryptUserRehashedLoginHash } from 'src/utils/crypto';
import {
  derivePasswordValues,
  encryptUserRehashedLoginHash,
} from 'src/utils/crypto';
import { createGroup } from 'src/utils/groups';
import { z } from 'zod';

import { groupCreationSchema } from './groups';
import { pageCreationSchema } from './pages';

export const userRegistrationSchema = once(() =>
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

    groupCreation: groupCreationSchema(),
    pageCreation: pageCreationSchema(),
  }),
);
export type UserRegistrationSchema = z.output<
  ReturnType<typeof userRegistrationSchema>
>;

export async function registerUser(
  input: {
    ip: string;
    userAgent: string;

    demo?: boolean;

    email: string;

    passwordValues: PasswordValues;

    dtrx?: DataTransaction;
  } & UserRegistrationSchema,
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
    groupMainPageId: input.pageId,
    groupIsPersonal: true,

    ...input.groupCreation,

    dtrx: input.dtrx,
  });

  await dataAbstraction().insert(
    'page',
    input.pageId,
    {
      id: input.pageId,

      encrypted_symmetric_keyring:
        input.pageCreation.pageEncryptedSymmetricKeyring,

      encrypted_relative_title: input.pageCreation.pageEncryptedRelativeTitle,
      encrypted_absolute_title: input.pageCreation.pageEncryptedAbsoluteTitle,

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

export async function checkCorrectUserPassword(input: {
  userId: string;
  loginHash: Uint8Array;
}) {
  const user = await UserModel.query()
    .findById(input.userId)
    .select('encrypted_rehashed_login_hash');

  if (user?.encrypted_rehashed_login_hash == null) {
    throw new TRPCError({
      message: 'User not found.',
      code: 'NOT_FOUND',
    });
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
  );

  const passwordValues = derivePasswordValues({
    password: input.loginHash,
    salt: passwordHashValues.saltBytes,
  });

  const passwordIsCorrect = sodium.memcmp(
    passwordValues.hash,
    passwordHashValues.hashBytes,
  );

  if (!passwordIsCorrect) {
    throw new TRPCError({
      message: 'Password is incorrect.',
      code: 'BAD_REQUEST',
    });
  }
}

export async function checkUserSubscription(input: {
  dataAbstraction: DataAbstraction<typeof dataHashes>;
  userId: string;
}) {
  if (
    (await input.dataAbstraction.hget('user', input.userId, 'plan')) !== 'pro'
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires a Pro plan subscription.',
    });
  }
}
