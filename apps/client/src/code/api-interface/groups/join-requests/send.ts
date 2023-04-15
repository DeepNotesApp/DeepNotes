import { bytesToBase64 } from '@stdlib/base64';
import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function sendJoinRequest(input: {
  groupId: string;
  userName: string;
}) {
  const groupPublicKeyring = createKeyring(
    await internals.realtime.hget('group', input.groupId, 'public-keyring'),
  );

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-requests/send`,

    body: {
      encryptedUserName: bytesToBase64(
        internals.keyPair.encrypt(
          textToBytes(input.userName),
          groupPublicKeyring,
          {
            padding: true,
          },
        ),
      ),
      encryptedUserNameForUser: bytesToBase64(
        internals.symmetricKeyring.encrypt(textToBytes(input.userName), {
          padding: true,
          associatedData: {
            context: 'GroupJoinRequestUserNameForUser',
            groupId: input.groupId,
            userId: authStore().userId,
          },
        }),
      ),
    },

    notifications: {
      agent: {
        groupId: input.groupId,

        // You have sent a join request.
      },

      observers: {
        groupId: input.groupId,

        agentId: authStore().userId,
        agentName: input.userName,

        // ${agentName} has sent a join request.
      },
    },
  });
}
