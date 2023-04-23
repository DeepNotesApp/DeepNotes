import type {
  rejectProcedureStep1,
  rejectProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/join-invitations/reject';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function rejectJoinInvitation(input: { groupId: string }) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinInvitations.reject`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof rejectProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
    };
  }

  async function step2(
    input_: typeof rejectProcedureStep1['_def']['_output_out'],
  ): Promise<typeof rejectProcedureStep2['_def']['_input_in']> {
    const agentName = await groupMemberNames()(
      `${input.groupId}:${authStore().userId}`,
    ).getAsync();

    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        notifications: {
          agent: {
            groupId: input.groupId,

            // You have rejected the invitation to join the group.
          },

          observers: {
            groupId: input.groupId,

            agentName: agentName.text,

            // ${agentName} has rejected the invitation to join the group.
          },
        },
      }),
    };
  }

  async function step3(
    _input: typeof rejectProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
