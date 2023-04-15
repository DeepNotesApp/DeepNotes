import type { UserModel } from '@deeplib/db';
import { GroupJoinInvitationModel, GroupJoinRequestModel } from '@deeplib/db';
import { GroupMemberModel, PageModel } from '@deeplib/db';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Safe,
  isBase64,
} from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { objFromEntries } from '@stdlib/misc';
import { z } from 'nestjs-zod/z';

import { dataAbstraction } from './data/data-abstraction';

export const groupKeyRotationSchema = z.object({
  groupAccessKeyring: z.string().refine(isBase64).optional(),
  groupEncryptedName: z.string().refine(isBase64),
  groupEncryptedContentKeyring: z.string().refine(isBase64),
  groupPublicKeyring: z.string().refine(isBase64),
  groupEncryptedPrivateKeyring: z.string().refine(isBase64),

  groupMembers: z.record(
    z.object({
      encryptedAccessKeyring: z.string().refine(isBase64).optional(),
      encryptedInternalKeyring: z.string().refine(isBase64),

      encryptedName: z.string().refine(isBase64),
    }),
  ),
  groupJoinInvitations: z.record(
    z.object({
      encryptedAccessKeyring: z.string().refine(isBase64).optional(),
      encryptedInternalKeyring: z.string().refine(isBase64),

      encryptedName: z.string().refine(isBase64),
    }),
  ),
  groupJoinRequests: z.record(
    z.object({
      encryptedName: z.string().refine(isBase64),
    }),
  ),

  groupPages: z.record(
    z.object({
      encryptedSymmetricKeyring: z.string().refine(isBase64),
    }),
  ),
});

export type GroupKeyRotationValues = z.infer<typeof groupKeyRotationSchema>;

export async function getGroupKeyRotationValues(
  groupId: string,
  userId: string,
) {
  const [
    [
      groupAccessKeyring,
      groupEncryptedName,
      groupEncryptedContentKeyring,

      groupPublicKeyring,
      groupEncryptedPrivateKeyring,
    ],

    [groupEncryptedAccessKeyring, groupEncryptedInternalKeyring],

    groupMembers,
    groupJoinInvitations,
    groupJoinRequests,

    groupPages,
  ] = await Promise.all([
    dataAbstraction().hmget('group', groupId, [
      'access-keyring',
      'encrypted-name',
      'encrypted-content-keyring',

      'public-keyring',
      'encrypted-private-keyring',
    ]),

    dataAbstraction().hmget('group-member', `${groupId}:${userId}`, [
      'encrypted-access-keyring',
      'encrypted-internal-keyring',
    ]),

    GroupMemberModel.query()
      .where('group_id', groupId)
      .join('users', 'users.id', 'group_members.user_id')
      .select(
        'users.public_keyring',

        'group_members.user_id',
        'group_members.encrypted_name',
      ) as unknown as (GroupMemberModel & UserModel)[],
    GroupJoinInvitationModel.query()
      .where('group_id', groupId)
      .join('users', 'users.id', 'group_join_invitations.user_id')
      .select(
        'users.public_keyring',

        'group_join_invitations.user_id',
        'group_join_invitations.encrypted_name',
      ) as unknown as (GroupJoinInvitationModel & UserModel)[],
    GroupJoinRequestModel.query()
      .where('group_id', groupId)
      .select(
        'group_join_requests.user_id',
        'group_join_requests.encrypted_name',
      ) as unknown as (GroupJoinRequestModel & UserModel)[],

    PageModel.query()
      .where('group_id', groupId)
      .select('id', 'encrypted_symmetric_keyring')
      .orderBy('id'),
  ]);

  return {
    groupAccessKeyring: bytesToBase64Safe(groupAccessKeyring),
    groupEncryptedName: bytesToBase64(groupEncryptedName),
    groupEncryptedContentKeyring: bytesToBase64(groupEncryptedContentKeyring),

    groupPublicKeyring: bytesToBase64(groupPublicKeyring),
    groupEncryptedPrivateKeyring: bytesToBase64(groupEncryptedPrivateKeyring),

    groupEncryptedAccessKeyring: bytesToBase64Safe(groupEncryptedAccessKeyring),
    groupEncryptedInternalKeyring: bytesToBase64(groupEncryptedInternalKeyring),

    groupMembers: objFromEntries(
      groupMembers.map((groupMember) => [
        groupMember.user_id,
        {
          publicKeyring: bytesToBase64(groupMember.public_keyring),

          encryptedName: bytesToBase64(groupMember.encrypted_name),
        },
      ]),
    ),
    groupJoinInvitations: objFromEntries(
      groupJoinInvitations.map((groupJoinInvitation) => [
        groupJoinInvitation.user_id,
        {
          publicKeyring: bytesToBase64(groupJoinInvitation.public_keyring),

          encryptedName: bytesToBase64(groupJoinInvitation.encrypted_name),
        },
      ]),
    ),
    groupJoinRequests: objFromEntries(
      groupJoinRequests.map((groupJoinRequest) => [
        groupJoinRequest.user_id,
        {
          encryptedName: bytesToBase64(groupJoinRequest.encrypted_name),
        },
      ]),
    ),

    groupPages: objFromEntries(
      groupPages.map((page) => [
        page.id,
        {
          encryptedSymmetricKeyring: bytesToBase64(
            page.encrypted_symmetric_keyring,
          ),
        },
      ]),
    ),
  };
}

export async function rotateGroupKeys(
  input: {
    groupId: string;

    dtrx?: DataTransaction;
  } & GroupKeyRotationValues,
) {
  await dataAbstraction().patch(
    'group',
    input.groupId,
    {
      access_keyring:
        input.groupAccessKeyring != null
          ? base64ToBytes(input.groupAccessKeyring)
          : null,

      encrypted_name: base64ToBytes(input.groupEncryptedName),
      encrypted_content_keyring: base64ToBytes(
        input.groupEncryptedContentKeyring,
      ),

      public_keyring: base64ToBytes(input.groupPublicKeyring),
      encrypted_private_keyring: base64ToBytes(
        input.groupEncryptedPrivateKeyring,
      ),
    },
    { dtrx: input.dtrx },
  );

  for (const [userId, groupMember] of Object.entries(input.groupMembers)) {
    await dataAbstraction().patch(
      'group-member',
      `${input.groupId}:${userId}`,
      {
        encrypted_access_keyring:
          groupMember.encryptedAccessKeyring != null
            ? base64ToBytes(groupMember.encryptedAccessKeyring)
            : null,
        encrypted_internal_keyring: base64ToBytes(
          groupMember.encryptedInternalKeyring,
        ),

        encrypted_name: base64ToBytes(groupMember.encryptedName),
      },
      { dtrx: input.dtrx },
    );
  }

  for (const [userId, groupJoinInvitation] of Object.entries(
    input.groupJoinInvitations,
  )) {
    await dataAbstraction().patch(
      'group-join-invitation',
      `${input.groupId}:${userId}`,
      {
        encrypted_access_keyring:
          groupJoinInvitation.encryptedAccessKeyring != null
            ? base64ToBytes(groupJoinInvitation.encryptedAccessKeyring)
            : null,
        encrypted_internal_keyring: base64ToBytes(
          groupJoinInvitation.encryptedInternalKeyring,
        ),

        encrypted_name: base64ToBytes(groupJoinInvitation.encryptedName),
      },
      { dtrx: input.dtrx },
    );
  }

  for (const [userId, groupJoinRequest] of Object.entries(
    input.groupJoinRequests,
  )) {
    await dataAbstraction().patch(
      'group-join-request',
      `${input.groupId}:${userId}`,
      { encrypted_name: base64ToBytes(groupJoinRequest.encryptedName) },
      { dtrx: input.dtrx },
    );
  }

  for (const [pageId, groupPage] of Object.entries(input.groupPages)) {
    await dataAbstraction().patch(
      'page',
      pageId,
      {
        encrypted_symmetric_keyring: base64ToBytes(
          groupPage.encryptedSymmetricKeyring,
        ),

        next_key_rotation_date: new Date(),
      },
      { dtrx: input.dtrx },
    );
  }
}
