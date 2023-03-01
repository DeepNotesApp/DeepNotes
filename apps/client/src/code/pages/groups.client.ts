import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';

import { groupMemberNames } from './computed/group-member-names.client';
import { requestWithNotifications } from './utils.client';

export async function acceptJoinInvitation(groupId: string, userName: string) {
  const groupPublicKeyring = createPublicKeyring(
    await internals.realtime.hget('group', groupId, 'public-keyring'),
  );

  const userEncryptedName = bytesToBase64(
    internals.keyPair.encrypt(textToBytes(userName), groupPublicKeyring, {
      padding: true,
    }),
  );

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-invitations/accept`,

    body: {
      userEncryptedName,
    },

    notifications: {
      agent: {
        groupId,

        // You have accepted the invitation to join the group.
      },

      observers: {
        groupId,

        agentName: userName,

        // ${agentName} has accepted the invitation to join the group.
      },
    },
  });
}

export async function rejectJoinInvitation(groupId: string) {
  const agentName = await groupMemberNames()(
    `${groupId}:${authStore().userId}`,
  ).getAsync();

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-invitations/reject`,

    notifications: {
      agent: {
        groupId,

        // You have rejected the invitation to join the group.
      },

      observers: {
        groupId,

        agentName: agentName.text,

        // ${agentName} has rejected the invitation to join the group.
      },
    },
  });
}
