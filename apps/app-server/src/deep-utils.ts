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

export async function createGroup(input: {
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
    input.groupId,
    {
      id: input.groupId,

      encrypted_name:
        base64ToBytesSafe(input.encryptedName) ?? new Uint8Array(),

      main_page_id: input.mainPageId,

      encrypted_rehashed_password_hash:
        input.passwordHash != null
          ? encryptGroupRehashedPasswordHash(
              computePasswordHash(base64ToBytes(input.passwordHash)),
            )
          : undefined,

      access_keyring: input.isPublic
        ? base64ToBytes(input.accessKeyring)
        : undefined,
      encrypted_content_keyring: base64ToBytes(input.encryptedContentKeyring),

      user_id: input.isPersonal ? input.userId : undefined,

      public_keyring: base64ToBytes(input.publicKeyring),
      encrypted_private_keyring: base64ToBytes(input.encryptedPrivateKeyring),
    },
    { dtrx: input.dtrx },
  );

  await dataAbstraction().insert(
    'group-member',
    `${input.groupId}:${input.userId}`,
    {
      group_id: input.groupId,
      user_id: input.userId,

      role: 'owner',

      encrypted_access_keyring: input.isPublic
        ? undefined
        : base64ToBytes(input.accessKeyring),
      encrypted_internal_keyring: base64ToBytes(input.encryptedInternalKeyring),

      encrypted_name: base64ToBytesSafe(input.encryptedUserName),
    },
    { dtrx: input.dtrx },
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

export async function createUser(
  input: {
    ip: string;
    userAgent: string;

    demo?: boolean;

    email: string;
    loginHash: string;

    passwordValues?: PasswordValues;

    dtrx?: DataTransaction;
  } & RegistrationValues,
) {
  const emailVerificationCode = nanoid();

  input.passwordValues ??= derivePasswordValues(base64ToBytes(input.loginHash));

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

    public_keyring: base64ToBytes(input.userPublicKeyring),
    encrypted_private_keyring: createPrivateKeyring(
      base64ToBytes(input.userEncryptedPrivateKeyring),
    ).wrapSymmetric(input.passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId: input.userId,
      },
    }).wrappedValue,
    encrypted_symmetric_keyring: createSymmetricKeyring(
      base64ToBytes(input.userEncryptedSymmetricKeyring),
    ).wrapSymmetric(input.passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId: input.userId,
      },
    }).wrappedValue,

    encrypted_name: base64ToBytes(input.userEncryptedName),
    encrypted_default_note: base64ToBytes(input.userEncryptedDefaultNote),
    encrypted_default_arrow: base64ToBytes(input.userEncryptedDefaultArrow),
  } as UserModel;

  await dataAbstraction().insert('user', input.userId, userModel, {
    dtrx: input.dtrx,
  });

  await createGroup({
    groupId: input.groupId,
    mainPageId: input.pageId,
    isPublic: false,
    isPersonal: true,

    userId: input.userId,

    accessKeyring: input.groupEncryptedAccessKeyring,
    encryptedInternalKeyring: input.groupEncryptedInternalKeyring,
    encryptedContentKeyring: input.groupEncryptedContentKeyring,

    publicKeyring: input.groupPublicKeyring,
    encryptedPrivateKeyring: input.groupEncryptedPrivateKeyring,

    dtrx: input.dtrx,
  });

  await dataAbstraction().insert(
    'page',
    input.pageId,
    {
      id: input.pageId,

      encrypted_symmetric_keyring: base64ToBytes(
        input.pageEncryptedSymmetricKeyring,
      ),

      encrypted_relative_title: base64ToBytes(input.pageEncryptedRelativeTitle),
      encrypted_absolute_title: base64ToBytes(input.pageEncryptedAbsoluteTitle),

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
