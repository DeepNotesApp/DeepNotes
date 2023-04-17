import type { UserModel } from '@deeplib/db';
import { GroupMemberModel, GroupModel } from '@deeplib/db';
import type { DataTransaction } from '@stdlib/data';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { z } from 'zod';

import {
  computePasswordHash,
  decryptGroupRehashedPasswordHash,
  encryptGroupRehashedPasswordHash,
} from '../crypto';
import { dataAbstraction } from '../data/data-abstraction';

export const groupCreationSchema = once(() =>
  z.object({
    groupEncryptedName: z.instanceof(Uint8Array),
    groupPasswordHash: z.instanceof(Uint8Array).optional(),
    groupIsPublic: z.boolean(),

    groupAccessKeyring: z.instanceof(Uint8Array),
    groupEncryptedInternalKeyring: z.instanceof(Uint8Array),
    groupEncryptedContentKeyring: z.instanceof(Uint8Array),

    groupPublicKeyring: z.instanceof(Uint8Array),
    groupEncryptedPrivateKeyring: z.instanceof(Uint8Array),

    groupMemberEncryptedName: z.instanceof(Uint8Array),
  }),
);
export type GroupCreationSchema = z.infer<
  ReturnType<typeof groupCreationSchema>
>;

export async function createGroup(input: {
  userId: string;

  groupId: string;

  groupMainPageId: string;
  groupIsPersonal: boolean;

  groupEncryptedName?: Uint8Array;
  groupPasswordHash?: Uint8Array;
  groupIsPublic: boolean;

  groupAccessKeyring: Uint8Array;
  groupEncryptedInternalKeyring: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;

  groupPublicKeyring: Uint8Array;
  groupEncryptedPrivateKeyring: Uint8Array;

  groupEncryptedUserName?: Uint8Array;

  dtrx?: DataTransaction;
}) {
  await dataAbstraction().insert(
    'group',
    input.groupId,
    {
      id: input.groupId,

      encrypted_name: input.groupEncryptedName ?? new Uint8Array(),

      main_page_id: input.groupMainPageId,

      encrypted_rehashed_password_hash:
        input.groupPasswordHash != null
          ? encryptGroupRehashedPasswordHash(
              computePasswordHash(input.groupPasswordHash),
            )
          : undefined,

      access_keyring: input.groupIsPublic
        ? input.groupAccessKeyring
        : undefined,
      encrypted_content_keyring: input.groupEncryptedContentKeyring,

      user_id: input.groupIsPersonal ? input.userId : undefined,

      public_keyring: input.groupPublicKeyring,
      encrypted_private_keyring: input.groupEncryptedPrivateKeyring,
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

      encrypted_access_keyring: input.groupIsPublic
        ? undefined
        : input.groupAccessKeyring,
      encrypted_internal_keyring: input.groupEncryptedInternalKeyring,

      encrypted_name: input.groupEncryptedUserName,
    },
    { dtrx: input.dtrx },
  );
}

export async function checkCorrectGroupPassword(input: {
  groupId: string;
  groupPasswordHash: Uint8Array;
}) {
  const group = await GroupModel.query()
    .findById(input.groupId)
    .select('encrypted_rehashed_password_hash');

  if (group == null) {
    throw new TRPCError({
      message: 'Group not found.',
      code: 'NOT_FOUND',
    });
  }

  if (group.encrypted_rehashed_password_hash == null) {
    throw new TRPCError({
      message: 'This group is not password protected.',
      code: 'BAD_REQUEST',
    });
  }

  if (
    !sodium.crypto_pwhash_str_verify(
      decryptGroupRehashedPasswordHash(group.encrypted_rehashed_password_hash),
      input.groupPasswordHash,
    )
  ) {
    throw new TRPCError({
      message: 'Group password is incorrect.',
      code: 'BAD_REQUEST',
    });
  }
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
      .select('users.id', 'users.public_keyring')) as unknown as UserModel[]
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
      .select('users.id', 'users.public_keyring')) as unknown as UserModel[]
  ).map((groupMember) => ({
    userId: groupMember.id,
    publicKeyring: groupMember.public_keyring,
  }));
}
