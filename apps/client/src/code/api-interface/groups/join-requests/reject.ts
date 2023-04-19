import type {
  rejectProcedureStep1,
  rejectProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/join-requests/reject';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function rejectJoinRequest(input: {
  groupId: string;
  patientId: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinRequests.reject`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof rejectProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,

      patientId: input.patientId,
    };
  }

  async function step2(
    input_: typeof rejectProcedureStep1['_def']['_output_out'],
  ): Promise<typeof rejectProcedureStep2['_def']['_input_in']> {
    const [groupName, agentName, targetName] = await Promise.all([
      groupNames()(input.groupId).getAsync(),
      groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
      groupRequestNames()(`${input.groupId}:${input.patientId}`).getAsync(),
    ]);

    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        patientId: input.patientId,

        notifications: {
          agent: {
            groupId: input.groupId,

            groupName: groupName.text,

            targetName: targetName.text,

            // You rejected the join request of ${targetName}.
          },

          target: {
            groupId: input.groupId,

            // Your join request was rejected.
          },

          observers: {
            groupId: input.groupId,

            groupName: groupName.text,

            agentName: agentName.text,
            targetName: targetName.text,

            // ${agentName} rejected the join request of ${targetName}.
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
