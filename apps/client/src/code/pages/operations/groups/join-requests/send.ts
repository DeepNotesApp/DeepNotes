import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { requestWithNotifications } from 'src/code/pages/utils.client';

export async function sendJoinRequest(
  groupId: string,
  {
    userName,
  }: {
    userName: string;
  },
) {
  const groupPublicKeyring = createPublicKeyring(
    await internals.realtime.hget('group', groupId, 'public-keyring'),
  );

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-requests/send`,

    body: {
      encryptedUserName: bytesToBase64(
        internals.keyPair.encrypt(textToBytes(userName), groupPublicKeyring, {
          padding: true,
        }),
      ),
      encryptedUserNameForUser: bytesToBase64(
        internals.symmetricKeyring.encrypt(textToBytes(userName), {
          padding: true,
          associatedData: {
            context: 'GroupJoinRequestUserNameForUser',
            groupId: groupId,
            userId: authStore().userId,
          },
        }),
      ),
    },

    notifications: {
      agent: {
        groupId: groupId,

        // You have sent a join request.
      },

      observers: {
        groupId: groupId,

        agentName: userName,

        // ${agentName} has sent a join request.
      },
    },
  });
}
