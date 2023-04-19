import type {
  cancelProcedureStep1,
  cancelProcedureStep2,
} from 'deepnotes-app-server-trpc/src/api/groups/join-requests/cancel';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function cancelJoinRequest(input: { groupId: string }) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinRequests.cancel`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof cancelProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
    };
  }

  async function step2(
    input_: typeof cancelProcedureStep1['_def']['_output_out'],
  ): Promise<typeof cancelProcedureStep2['_def']['_input_in']> {
    const agentName = await groupRequestNames()(
      `${input.groupId}:${authStore().userId}`,
    ).getAsync();

    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        notifications: {
          agent: {
            groupId: input.groupId,

            // You canceled your join request.
          },

          observers: {
            groupId: input.groupId,

            agentName: agentName.text,

            // ${agentName} canceled their join request.
          },
        },
      }),
    };
  }

  async function step3(
    _input: typeof cancelProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
