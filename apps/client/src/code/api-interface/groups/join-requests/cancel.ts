import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function cancelJoinRequest(groupId: string) {
  const agentName = await groupRequestNames()(
    `${groupId}:${authStore().userId}`,
  ).getAsync();

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-requests/cancel`,

    notifications: {
      agent: {
        groupId: groupId,

        // You canceled your join request.
      },

      observers: {
        groupId: groupId,

        agentName: agentName.text,

        // ${agentName} canceled their join request.
      },
    },
  });
}
