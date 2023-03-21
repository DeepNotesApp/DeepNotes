import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';

export async function rejectJoinInvitation(groupId: string) {
  const agentName = await groupMemberNames()(
    `${groupId}:${authStore().userId}`,
  ).getAsync();

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-invitations/reject`,

    notifications: {
      agent: {
        groupId,

        // You have rejected the invitation to join the group.
      },

      observers: {
        groupId,

        agentName: agentName.text,

        // ${agentName} has rejected the invitation to join the group.
      },
    },
  });
}
