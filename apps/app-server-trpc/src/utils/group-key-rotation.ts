import type { UserModel } from '@deeplib/db';
import { GroupJoinInvitationModel, GroupJoinRequestModel } from '@deeplib/db';
import { GroupMemberModel, PageModel } from '@deeplib/db';
import type { DataTransaction } from '@stdlib/data';
import { objFromEntries } from '@stdlib/misc';
import { dataAbstraction } from 'src/data/data-abstraction';
import { z } from 'zod';

export const groupKeyRotationSchema = z.object({
  groupAccessKeyring: z.instanceof(Uint8Array).optional(),
  groupEncryptedName: z.instanceof(Uint8Array),
  groupEncryptedContentKeyring: z.instanceof(Uint8Array),

  groupPublicKeyring: z.instanceof(Uint8Array),
  groupEncryptedPrivateKeyring: z.instanceof(Uint8Array),

  groupMembers: z.record(
    z.object({
      encryptedAccessKeyring: z.instanceof(Uint8Array).optional(),
      encryptedInternalKeyring: z.instanceof(Uint8Array),

      encryptedName: z.instanceof(Uint8Array),
    }),
  ),
  groupJoinInvitations: z.record(
    z.object({
      encryptedAccessKeyring: z.instanceof(Uint8Array).optional(),
      encryptedInternalKeyring: z.instanceof(Uint8Array),

      encryptedName: z.instanceof(Uint8Array),
    }),
  ),
  groupJoinRequests: z.record(
    z.object({
      encryptedName: z.instanceof(Uint8Array),
    }),
  ),

  groupPages: z.record(
    z.object({
      encryptedSymmetricKeyring: z.instanceof(Uint8Array),
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
    groupAccessKeyring: groupAccessKeyring,
    groupEncryptedName: groupEncryptedName,
    groupEncryptedContentKeyring: groupEncryptedContentKeyring,

    groupPublicKeyring: groupPublicKeyring,
    groupEncryptedPrivateKeyring: groupEncryptedPrivateKeyring,

    groupEncryptedAccessKeyring: groupEncryptedAccessKeyring,
    groupEncryptedInternalKeyring: groupEncryptedInternalKeyring,

    groupMembers: objFromEntries(
      groupMembers.map((groupMember) => [
        groupMember.user_id,
        {
          publicKeyring: groupMember.public_keyring,

          encryptedName: groupMember.encrypted_name,
        },
      ]),
    ),
    groupJoinInvitations: objFromEntries(
      groupJoinInvitations.map((groupJoinInvitation) => [
        groupJoinInvitation.user_id,
        {
          publicKeyring: groupJoinInvitation.public_keyring,

          encryptedName: groupJoinInvitation.encrypted_name,
        },
      ]),
    ),
    groupJoinRequests: objFromEntries(
      groupJoinRequests.map((groupJoinRequest) => [
        groupJoinRequest.user_id,
        {
          encryptedName: groupJoinRequest.encrypted_name,
        },
      ]),
    ),

    groupPages: objFromEntries(
      groupPages.map((page) => [
        page.id,
        {
          encryptedSymmetricKeyring: page.encrypted_symmetric_keyring,
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
        input.groupAccessKeyring != null ? input.groupAccessKeyring : null,

      encrypted_name: input.groupEncryptedName,
      encrypted_content_keyring: input.groupEncryptedContentKeyring,

      public_keyring: input.groupPublicKeyring,
      encrypted_private_keyring: input.groupEncryptedPrivateKeyring,
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
            ? groupMember.encryptedAccessKeyring
            : null,
        encrypted_internal_keyring: groupMember.encryptedInternalKeyring,

        encrypted_name: groupMember.encryptedName,
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
            ? groupJoinInvitation.encryptedAccessKeyring
            : null,
        encrypted_internal_keyring:
          groupJoinInvitation.encryptedInternalKeyring,

        encrypted_name: groupJoinInvitation.encryptedName,
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
      { encrypted_name: groupJoinRequest.encryptedName },
      { dtrx: input.dtrx },
    );
  }

  for (const [pageId, groupPage] of Object.entries(input.groupPages)) {
    await dataAbstraction().patch(
      'page',
      pageId,
      {
        encrypted_symmetric_keyring: groupPage.encryptedSymmetricKeyring,

        next_key_rotation_date: new Date(),
      },
      { dtrx: input.dtrx },
    );
  }
}
