import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function rejectJoinRequest(input: {
  groupId: string;
  patientId: string;
}) {
  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),
    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    groupRequestNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-requests/reject`,

    body: {
      patientId: input.patientId,
    },

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
  });
}
