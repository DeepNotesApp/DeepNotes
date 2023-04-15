import { bytesToBase64 } from '@stdlib/base64';
import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function acceptJoinInvitation(input: {
  groupId: string;
  userName: string;
}) {
  const groupPublicKeyring = createKeyring(
    await internals.realtime.hget('group', input.groupId, 'public-keyring'),
  );

  const userEncryptedName = bytesToBase64(
    internals.keyPair.encrypt(textToBytes(input.userName), groupPublicKeyring, {
      padding: true,
    }),
  );

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-invitations/accept`,

    body: {
      userEncryptedName,
    },

    notifications: {
      agent: {
        groupId: input.groupId,

        // You have accepted the invitation to join the group.
      },

      observers: {
        groupId: input.groupId,

        agentName: input.userName,

        // ${agentName} has accepted the invitation to join the group.
      },
    },
  });
}
