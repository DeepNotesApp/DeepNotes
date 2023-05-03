import type {
  acceptProcedureStep1,
  acceptProcedureStep2,
} from '@deepnotes/app-server/src/websocket/groups/join-invitations/accept';
import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function acceptJoinInvitation(input: {
  groupId: string;
  userName: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinInvitations.accept`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof acceptProcedureStep1['_def']['_input_in']
  > {
    const groupPublicKeyring = createKeyring(
      await internals.realtime.hget('group', input.groupId, 'public-keyring'),
    );

    const userEncryptedName = internals.keyPair.encrypt(
      textToBytes(input.userName),
      groupPublicKeyring,
      { padding: true },
    );

    return {
      groupId: input.groupId,

      userEncryptedName,
    };
  }

  async function step2(
    input_: typeof acceptProcedureStep1['_def']['_output_out'],
  ): Promise<typeof acceptProcedureStep2['_def']['_input_in']> {
    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

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
      }),
    };
  }

  async function step3(
    _input: typeof acceptProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
