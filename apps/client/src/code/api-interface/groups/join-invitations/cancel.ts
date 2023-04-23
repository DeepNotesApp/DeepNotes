import type {
  cancelProcedureStep1,
  cancelProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/join-invitations/cancel';
import { groupInvitationNames } from 'src/code/pages/computed/group-invitation-names';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function cancelJoinInvitation(input: {
  groupId: string;
  patientId: string;
}) {
  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),

    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    groupInvitationNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinInvitations.cancel`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof cancelProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,

      patientId: input.patientId,
    };
  }

  async function step2(
    input_: typeof cancelProcedureStep1['_def']['_output_out'],
  ): Promise<typeof cancelProcedureStep2['_def']['_input_in']> {
    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        patientId: input.patientId,

        notifications: {
          agent: {
            groupId: input.groupId,

            groupName: groupName.text,
            targetName: targetName.text,

            // You have canceled the invitation of ${targetName} to join the group.
          },

          target: {
            groupId: input.groupId,

            // Your invitation to join the group has been canceled.
          },

          observers: {
            groupId: input.groupId,

            groupName: groupName.text,
            agentName: agentName.text,
            targetName: targetName.text,

            // ${agentName} has canceled the invitation of ${targetName} to join the group.
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
