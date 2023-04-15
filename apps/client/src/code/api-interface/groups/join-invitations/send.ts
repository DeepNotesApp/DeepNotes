import type { GroupRoleID } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { bytesToBase64Safe } from '@stdlib/base64';
import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function sendJoinInvitation(input: {
  groupId: string;
  inviteeUserId: string;
  inviteeRole: GroupRoleID;
  inviteeUserName: string;
}) {
  if (input.inviteeUserId == null) {
    throw new Error('User not found.');
  }

  const [
    inviteePublicKeyring,
    groupPublicKeyring,

    accessKeyring,
    groupInternalKeyring,

    groupName,
    agentName,
  ] = await Promise.all([
    (async () =>
      createKeyring(
        await internals.realtime.hget(
          'user',
          input.inviteeUserId,
          'public-keyring',
        ),
      ))(),
    (async () =>
      createKeyring(
        await internals.realtime.hget('group', input.groupId, 'public-keyring'),
      ))(),

    groupAccessKeyrings()(input.groupId).getAsync(),
    groupInternalKeyrings()(input.groupId).getAsync(),

    groupNames()(input.groupId).getAsync(),
    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
  ]);

  if (accessKeyring == null || groupInternalKeyring == null) {
    throw new Error('Group keyrings not found.');
  }

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-invitations/send`,

    body: {
      patientId: input.inviteeUserId,
      invitationRole: input.inviteeRole,

      encryptedAccessKeyring: bytesToBase64(
        accessKeyring.wrapAsymmetric(internals.keyPair, inviteePublicKeyring)
          .wrappedValue,
      ),
      encryptedInternalKeyring: bytesToBase64(
        groupInternalKeyring.wrapAsymmetric(
          internals.keyPair,
          inviteePublicKeyring,
        ).wrappedValue,
      ),

      userEncryptedName: bytesToBase64Safe(
        internals.keyPair.encrypt(
          textToBytes(input.inviteeUserName),
          groupPublicKeyring,
          { padding: true },
        ),
      ),
    },

    patientId: input.inviteeUserId,

    notifications: {
      agent: {
        groupId: input.groupId,

        patientId: input.inviteeUserId,
        groupName: groupName.text,
        targetName: input.inviteeUserName,

        // You invited ${targetName} to join the group.
      },

      target: {
        groupId: input.groupId,

        groupName: groupName.text,

        // Your were invited to join the group.
      },

      observers: {
        groupId: input.groupId,

        groupName: groupName.text,
        agentName: agentName.text,
        targetName: input.inviteeUserName,

        // ${agentName} invited ${targetName} to join the group.
      },
    },
  });
}
