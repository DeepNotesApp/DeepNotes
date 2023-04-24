import type {
  removeUserProcedureStep1,
  removeUserProcedureStep2,
} from 'deepnotes-app-server/src/websocket/groups/remove-user';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function removeGroupUser(input: {
  groupId: string;
  patientId: string;
}) {
  const agentId = authStore().userId;

  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),

    groupMemberNames()(`${input.groupId}:${agentId}`).getAsync(),
    groupMemberNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/groups.removeUser`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof removeUserProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
      patientId: input.patientId,
    };
  }

  async function step2(
    input_: typeof removeUserProcedureStep1['_def']['_output_out'],
  ): Promise<typeof removeUserProcedureStep2['_def']['_input_in']> {
    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        patientId: input.patientId,

        notifications: {
          agent: {
            groupId: input.groupId,

            removed: agentId !== input.patientId,

            groupName: groupName.text,
            targetName: targetName.text,

            // You left the group.
            // You removed ${targetName} from the group.
          },

          ...(agentId !== input.patientId
            ? {
                target: {
                  groupId: input.groupId,

                  removed: true,

                  groupName: groupName.text,

                  // You were removed from the group.
                },
              }
            : {}),

          observers: {
            groupId: input.groupId,

            removed: agentId !== input.patientId,

            groupName: groupName.text,
            agentName: agentName.text,
            ...(agentId !== input.patientId
              ? { targetName: targetName.text }
              : {}),

            // ${agentName} left the group.
            // ${agentName} removed ${targetName} from the group.
          },
        },
      }),
    };
  }

  async function step3(
    _input: typeof removeUserProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
