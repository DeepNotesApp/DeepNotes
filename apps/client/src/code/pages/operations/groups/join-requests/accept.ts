import type { GroupRoleID } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings.client';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';

export async function acceptJoinRequest(
  groupId: string,
  {
    patientId,
    targetRole,
  }: {
    patientId: string;
    targetRole: GroupRoleID;
  },
) {
  if (targetRole == null) {
    throw new Error('Please select a role.');
  }

  const [
    accessKeyring,
    groupInternalKeyring,

    userPublicKeyringBytes,

    groupName,
    agentName,
    targetName,
  ] = await Promise.all([
    groupAccessKeyrings()(groupId).getAsync(),
    groupInternalKeyrings()(groupId).getAsync(),

    internals.realtime.hget('user', patientId, 'public-keyring'),

    groupNames()(groupId).getAsync(),
    groupMemberNames()(`${groupId}:${authStore().userId}`).getAsync(),
    groupRequestNames()(`${groupId}:${patientId}`).getAsync(),
  ]);

  if (accessKeyring == null || groupInternalKeyring == null) {
    throw new Error('Group keyrings not found.');
  }

  const userPublicKeyring = createPublicKeyring(userPublicKeyringBytes);

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-requests/accept`,

    body: {
      patientId,
      targetRole: targetRole,

      encryptedAccessKeyring: bytesToBase64(
        accessKeyring.wrapAsymmetric(internals.keyPair, userPublicKeyring)
          .fullValue,
      ),
      encryptedInternalKeyring: bytesToBase64(
        groupInternalKeyring.wrapAsymmetric(
          internals.keyPair,
          userPublicKeyring,
        ).fullValue,
      ),
    },

    patientId,

    notifications: {
      agent: {
        groupId,

        groupName: groupName.text,

        targetName: targetName.text,

        // You have accepted the join request of ${targetName}.
      },

      target: {
        groupId,

        groupName: groupName.text,

        // Your join request was accepted.
      },

      observers: {
        groupId,

        groupName: groupName.text,

        agentName: agentName.text,

        targetName: targetName.text,

        // ${agentName} has accepted the join request of ${targetName}.
      },
    },
  });
}
