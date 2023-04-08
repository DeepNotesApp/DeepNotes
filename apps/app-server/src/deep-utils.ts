import {
  encryptUserEmail,
  hashUserEmail,
  userHasPermission as _userHasPermission,
} from '@deeplib/data';
import { SessionModel, UserModel } from '@deeplib/db';
import { GroupMemberModel } from '@deeplib/db';
import type { IGroupRole } from '@deeplib/misc';
import { base64ToBytes, base64ToBytesSafe } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { addHours } from '@stdlib/misc';
import { once, pull } from 'lodash';
import { nanoid } from 'nanoid';
import { z } from 'nestjs-zod/z';

import type { RegistrationValues } from './auth/register/register.controller';
import type { PasswordValues } from './crypto';
import { computePasswordHash, derivePasswordValues } from './crypto';
import { dataAbstraction } from './data/data-abstraction';
import {
  encryptGroupRehashedPasswordHash,
  encryptUserRehashedLoginHash,
} from './utils';

export const RoleEnum = once(() =>
  z.enum(['owner', 'admin', 'moderator', 'member', 'viewer']),
);

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

  encryptedName?: string;

  mainPageId: string;

  passwordHash?: string;

  isPublic: boolean;

  isPersonal: boolean;
  userId: string;

  accessKeyring: string;
  encryptedInternalKeyring: string;
  encryptedContentKeyring: string;

  publicKeyring: string;
  encryptedPrivateKeyring: string;

  encryptedUserName?: string;

  dtrx?: DataTransaction;
}) {
  await dataAbstraction().insert(
    'group',
    groupId,
    {
      id: groupId,

      encrypted_name: base64ToBytesSafe(encryptedName) ?? new Uint8Array(),

      main_page_id: mainPageId,

      encrypted_rehashed_password_hash:
        passwordHash != null
          ? encryptGroupRehashedPasswordHash(
              computePasswordHash(base64ToBytes(passwordHash)),
            )
          : undefined,

      access_keyring: isPublic ? base64ToBytes(accessKeyring) : undefined,
      encrypted_content_keyring: base64ToBytes(encryptedContentKeyring),

      user_id: isPersonal ? userId : undefined,

      public_keyring: base64ToBytes(publicKeyring),
      encrypted_private_keyring: base64ToBytes(encryptedPrivateKeyring),
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

      encrypted_access_keyring: isPublic
        ? undefined
        : base64ToBytes(accessKeyring),
      encrypted_internal_keyring: base64ToBytes(encryptedInternalKeyring),

      encrypted_name: base64ToBytesSafe(encryptedUserName),
    },
    { dtrx },
  );
}

export async function getGroupManagers(
  groupId: string,
  extraUserIds?: string[],
): Promise<{ userId: string; publicKeyring: Uint8Array }[]> {
  return (
    (await GroupMemberModel.query()
      .leftJoin('users', 'users.id', 'group_members.user_id')
      .where('group_id', groupId)
      .whereIn('group_members.role', ['owner', 'admin', 'moderator'])
      .orWhereIn('users.id', extraUserIds ?? [])
      .select(
        'users.id',
        'users.public_keyring',
      )) as unknown as (GroupMemberModel & UserModel)[]
  ).map((groupMember) => ({
    userId: groupMember.id,
    publicKeyring: groupMember.public_keyring,
  }));
}

export async function getGroupMembers(
  groupId: string,
  extraUserIds?: string[],
): Promise<{ userId: string; publicKeyring: Uint8Array }[]> {
  return (
    (await GroupMemberModel.query()
      .leftJoin('users', 'users.id', 'group_members.user_id')
      .where('group_id', groupId)
      .orWhereIn('users.id', extraUserIds ?? [])
      .select(
        'users.id',
        'users.public_keyring',
      )) as unknown as (GroupMemberModel & UserModel)[]
  ).map((groupMember) => ({
    userId: groupMember.id,
    publicKeyring: groupMember.public_keyring,
  }));
}

export async function bumpRecentItem(
  userId: string,
  itemType: 'group' | 'page',
  itemId: string,
  params?: { dtrx?: DataTransaction },
) {
  const recentItemIds: string[] = await dataAbstraction().hget(
    'user',
    userId,
    `recent-${itemType}-ids`,
  );

  // Prepend item ID to recent item IDs

  pull(recentItemIds, itemId);
  recentItemIds.splice(0, 0, itemId);

  while (recentItemIds.length > 50) {
    recentItemIds.pop();
  }

  // Update recent item IDs

  await dataAbstraction().patch(
    'user',
    userId,
    { [`recent_${itemType}_ids`]: recentItemIds },
    { dtrx: params?.dtrx },
  );
}

export async function userHasPermission(
  userId: string,
  groupId: string,
  permission: keyof IGroupRole['permissions'],
) {
  return await _userHasPermission(
    dataAbstraction(),
    userId,
    groupId,
    permission,
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
  loginHash: string;

  passwordValues?: PasswordValues;

  dtrx?: DataTransaction;
} & RegistrationValues) {
  const emailVerificationCode = nanoid();

  passwordValues ??= derivePasswordValues(base64ToBytes(loginHash));

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

    public_keyring: base64ToBytes(userPublicKeyring),
    encrypted_private_keyring: createPrivateKeyring(
      base64ToBytes(userEncryptedPrivateKeyring),
    ).wrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId,
      },
    }).wrappedValue,
    encrypted_symmetric_keyring: createSymmetricKeyring(
      base64ToBytes(userEncryptedSymmetricKeyring),
    ).wrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId,
      },
    }).wrappedValue,

    encrypted_name: base64ToBytes(userEncryptedName),
    encrypted_default_note: base64ToBytes(userEncryptedDefaultNote),
    encrypted_default_arrow: base64ToBytes(userEncryptedDefaultArrow),
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

      encrypted_symmetric_keyring: base64ToBytes(pageEncryptedSymmetricKeyring),

      encrypted_relative_title: base64ToBytes(pageEncryptedRelativeTitle),
      encrypted_absolute_title: base64ToBytes(pageEncryptedAbsoluteTitle),

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

export async function invalidateAllSessions(
  userId: string,
  params?: { dtrx?: DataTransaction },
) {
  const sessions = await SessionModel.query()
    .where('user_id', userId)
    .whereNot('invalidated', true)
    .select('id');

  await Promise.all(
    sessions.map((session) =>
      dataAbstraction().patch(
        'session',
        session.id,
        { invalidated: true },
        { dtrx: params?.dtrx },
      ),
    ),
  );
}
