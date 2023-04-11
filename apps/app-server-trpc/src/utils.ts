import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { addHours } from '@stdlib/misc';
import { nanoid } from 'nanoid';

import type { RegistrationSchema } from './api/users/register';
import type { PasswordValues } from './crypto';
import {
  computePasswordHash,
  encryptGroupRehashedPasswordHash,
} from './crypto';
import { encryptUserRehashedLoginHash } from './crypto';
import { derivePasswordValues } from './crypto';
import { dataAbstraction } from './data/data-abstraction';

export async function createGroup({
  groupId,
  userId,
  isPersonal,
  encryptedName,
  mainPageId,
  passwordHash,
  isPublic,
  accessKeyring,
  encryptedInternalKeyring,
  encryptedContentKeyring,
  publicKeyring,
  encryptedPrivateKeyring,
  encryptedUserName,
  dtrx,
}: {
  groupId: string;

  encryptedName?: Uint8Array;

  mainPageId: string;

  passwordHash?: Uint8Array;

  isPublic: boolean;

  isPersonal: boolean;
  userId: string;

  accessKeyring: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
  encryptedContentKeyring: Uint8Array;

  publicKeyring: Uint8Array;
  encryptedPrivateKeyring: Uint8Array;

  encryptedUserName?: Uint8Array;

  dtrx?: DataTransaction;
}) {
  await dataAbstraction().insert(
    'group',
    groupId,
    {
      id: groupId,

      encrypted_name: encryptedName ?? new Uint8Array(),

      main_page_id: mainPageId,

      encrypted_rehashed_password_hash:
        passwordHash != null
          ? encryptGroupRehashedPasswordHash(computePasswordHash(passwordHash))
          : undefined,

      access_keyring: isPublic ? accessKeyring : undefined,
      encrypted_content_keyring: encryptedContentKeyring,

      user_id: isPersonal ? userId : undefined,

      public_keyring: publicKeyring,
      encrypted_private_keyring: encryptedPrivateKeyring,
    },
    { dtrx },
  );

  await dataAbstraction().insert(
    'group-member',
    `${groupId}:${userId}`,
    {
      group_id: groupId,
      user_id: userId,

      role: 'owner',

      encrypted_access_keyring: isPublic ? undefined : accessKeyring,
      encrypted_internal_keyring: encryptedInternalKeyring,

      encrypted_name: encryptedUserName,
    },
    { dtrx },
  );
}

export async function createUser({
  demo,

  email,
  loginHash,

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
  loginHash: Uint8Array;

  passwordValues?: PasswordValues;

  dtrx?: DataTransaction;
} & RegistrationSchema) {
  const emailVerificationCode = nanoid();

  passwordValues ??= derivePasswordValues(loginHash);

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
