import type { GroupRoleID } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function changeUserRole(input: {
  groupId: string;
  patientId: string;
  role: GroupRoleID;
}) {
  const agentId = authStore().userId;
  const roleName = rolesMap()[input.role].name;

  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),

    groupMemberNames()(`${input.groupId}:${agentId}`).getAsync(),
    groupMemberNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/change-user-role`,

    body: {
      patientId: input.patientId,
      requestedRole: input.role,
    },

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
  });
}
