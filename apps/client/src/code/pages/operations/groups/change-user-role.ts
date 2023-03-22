import type { GroupRoleID } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';

export async function changeUserRole(
  groupId: string,
  {
    patientId,
    role,
  }: {
    patientId: string;
    role: GroupRoleID;
  },
) {
  const agentId = authStore().userId;
  const roleName = rolesMap()[role].name;

  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(groupId).getAsync(),

    groupMemberNames()(`${groupId}:${agentId}`).getAsync(),
    groupMemberNames()(`${groupId}:${patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${groupId}/change-user-role`,

    body: {
      patientId,
      requestedRole: role,
    },

    patientId,

    notifications: {
      agent: {
        groupId: groupId,

        groupName: groupName.text,
        targetName: targetName.text,
        roleName,

        // You changed the role of ${targetName} to ${roleName}.
      },

      target: {
        groupId: groupId,

        groupName: groupName.text,
        roleName,

        // Your role was changed to ${roleName}.
      },

      observers: {
        groupId: groupId,

        groupName: groupName.text,
        agentName: agentName.text,
        targetName: targetName.text,
        roleName,

        // ${agentName} changed the role of ${targetName} to ${roleName}.
      },
    },
  });
}
