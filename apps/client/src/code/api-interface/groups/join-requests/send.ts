import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import type {
  sendProcedureStep1,
  sendProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/join-requests/send';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function sendJoinRequest(input: {
  groupId: string;
  userName: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinRequests.send`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof sendProcedureStep1['_def']['_input_in']
  > {
    const groupPublicKeyring = createKeyring(
      await internals.realtime.hget('group', input.groupId, 'public-keyring'),
    );

    return {
      groupId: input.groupId,

      encryptedUserName: internals.keyPair.encrypt(
        textToBytes(input.userName),
        groupPublicKeyring,
        { padding: true },
      ),
      encryptedUserNameForUser: internals.symmetricKeyring.encrypt(
        textToBytes(input.userName),
        {
          padding: true,
          associatedData: {
            context: 'GroupJoinRequestUserNameForUser',
            groupId: input.groupId,
            userId: authStore().userId,
          },
        },
      ),
    };
  }

  async function step2(
    input_: typeof sendProcedureStep1['_def']['_output_out'],
  ): Promise<typeof sendProcedureStep2['_def']['_input_in']> {
    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

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
      }),
    };
  }

  async function step3(
    _input: typeof sendProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
