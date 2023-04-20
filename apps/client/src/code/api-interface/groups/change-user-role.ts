import type { GroupRoleID } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import type {
  changeUserRoleProcedureStep1,
  changeUserRoleProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/change-user-role';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function changeUserRole(input: {
  groupId: string;
  patientId: string;
  role: GroupRoleID;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.changeUserRole`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof changeUserRoleProcedureStep1['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
      patientId: input.patientId,
      requestedRole: input.role,
    };
  }

  async function step2(
    input_: typeof changeUserRoleProcedureStep1['_def']['_output_out'],
  ): Promise<typeof changeUserRoleProcedureStep2['_def']['_input_in']> {
    const agentId = authStore().userId;
    const roleName = rolesMap()[input.role].name;

    const [groupName, agentName, targetName] = await Promise.all([
      groupNames()(input.groupId).getAsync(),

      groupMemberNames()(`${input.groupId}:${agentId}`).getAsync(),
      groupMemberNames()(`${input.groupId}:${input.patientId}`).getAsync(),
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
            roleName,

            // You changed the role of ${targetName} to ${roleName}.
          },

          target: {
            groupId: input.groupId,

            groupName: groupName.text,
            roleName,

            // Your role was changed to ${roleName}.
          },

          observers: {
            groupId: input.groupId,

            groupName: groupName.text,
            agentName: agentName.text,
            targetName: targetName.text,
            roleName,

            // ${agentName} changed the role of ${targetName} to ${roleName}.
          },
        },
      }),
    };
  }

  async function step3(
    _input: typeof changeUserRoleProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
