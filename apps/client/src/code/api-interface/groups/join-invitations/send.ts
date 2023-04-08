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

export async function sendJoinInvitation(
  groupId: string,
  {
    inviteeUserId,
    inviteeRole,
    inviteeUserName,
  }: {
    inviteeUserId: string;
    inviteeRole: GroupRoleID;
    inviteeUserName: string;
  },
) {
  if (inviteeUserId == null) {
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
        await internals.realtime.hget('user', inviteeUserId, 'public-keyring'),
      ))(),
    (async () =>
      createKeyring(
        await internals.realtime.hget('group', groupId, 'public-keyring'),
      ))(),

    groupAccessKeyrings()(groupId).getAsync(),
    groupInternalKeyrings()(groupId).getAsync(),

    groupNames()(groupId).getAsync(),
    groupMemberNames()(`${groupId}:${authStore().userId}`).getAsync(),
  ]);

  if (accessKeyring == null || groupInternalKeyring == null) {
    throw new Error('Group keyrings not found.');
  }

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-invitations/send`,

    body: {
      patientId: inviteeUserId,
      invitationRole: inviteeRole,

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
          textToBytes(inviteeUserName),
          groupPublicKeyring,
          { padding: true },
        ),
      ),
    },

    patientId: inviteeUserId,

    notifications: {
      agent: {
        groupId: groupId,

        patientId: inviteeUserId,
        groupName: groupName.text,
        targetName: inviteeUserName,

        // You invited ${targetName} to join the group.
      },

      target: {
        groupId: groupId,

        groupName: groupName.text,

        // Your were invited to join the group.
      },

      observers: {
        groupId: groupId,

        groupName: groupName.text,
        agentName: agentName.text,
        targetName: inviteeUserName,

        // ${agentName} invited ${targetName} to join the group.
      },
    },
  });
}
