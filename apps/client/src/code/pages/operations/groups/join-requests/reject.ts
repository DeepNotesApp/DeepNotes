import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';

export async function rejectJoinRequest(
  groupId: string,
  {
    patientId,
  }: {
    patientId: string;
  },
) {
  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(groupId).getAsync(),
    groupMemberNames()(`${groupId}:${authStore().userId}`).getAsync(),
    groupRequestNames()(`${groupId}:${patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-requests/reject`,

    body: {
      patientId,
    },

    patientId,

    notifications: {
      agent: {
        groupId,

        groupName: groupName.text,

        targetName: targetName.text,

        // You rejected the join request of ${targetName}.
      },

      target: {
        groupId,

        // Your join request was rejected.
      },

      observers: {
        groupId,

        groupName: groupName.text,

        agentName: agentName.text,
        targetName: targetName.text,

        // ${agentName} rejected the join request of ${targetName}.
      },
    },
  });
}
