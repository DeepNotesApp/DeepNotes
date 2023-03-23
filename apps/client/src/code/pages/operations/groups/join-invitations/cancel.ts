import { groupInvitationNames } from 'src/code/pages/computed/group-invitation-names';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function cancelJoinInvitation(
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
    groupInvitationNames()(`${groupId}:${patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${groupId}/join-invitations/cancel`,

    body: {
      patientId,
    },

    patientId,

    notifications: {
      agent: {
        groupId,

        groupName: groupName.text,
        targetName: targetName.text,

        // You have canceled the invitation of ${targetName} to join the group.
      },

      target: {
        groupId,

        // Your invitation to join the group has been canceled.
      },

      observers: {
        groupId,

        groupName: groupName.text,
        agentName: agentName.text,
        targetName: targetName.text,

        // ${agentName} has canceled the invitation of ${targetName} to join the group.
      },
    },
  });
}
