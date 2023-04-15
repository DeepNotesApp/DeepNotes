import type { GroupRoleID } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createKeyring } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function acceptJoinRequest(input: {
  groupId: string;
  patientId: string;
  targetRole: GroupRoleID;
}) {
  if (input.targetRole == null) {
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
    groupAccessKeyrings()(input.groupId).getAsync(),
    groupInternalKeyrings()(input.groupId).getAsync(),

    internals.realtime.hget('user', input.patientId, 'public-keyring'),

    groupNames()(input.groupId).getAsync(),
    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    groupRequestNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  if (accessKeyring == null || groupInternalKeyring == null) {
    throw new Error('Group keyrings not found.');
  }

  const userPublicKeyring = createKeyring(userPublicKeyringBytes);

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-requests/accept`,

    body: {
      patientId: input.patientId,
      targetRole: input.targetRole,

      encryptedAccessKeyring: bytesToBase64(
        accessKeyring.wrapAsymmetric(internals.keyPair, userPublicKeyring)
          .wrappedValue,
      ),
      encryptedInternalKeyring: bytesToBase64(
        groupInternalKeyring.wrapAsymmetric(
          internals.keyPair,
          userPublicKeyring,
        ).wrappedValue,
      ),
    },

    patientId: input.patientId,

    notifications: {
      agent: {
        groupId: input.groupId,

        groupName: groupName.text,

        targetName: targetName.text,

        // You have accepted the join request of ${targetName}.
      },

      target: {
        groupId: input.groupId,

        groupName: groupName.text,

        // Your join request was accepted.
      },

      observers: {
        groupId: input.groupId,

        groupName: groupName.text,

        agentName: agentName.text,

        targetName: targetName.text,

        // ${agentName} has accepted the join request of ${targetName}.
      },
    },
  });
}
