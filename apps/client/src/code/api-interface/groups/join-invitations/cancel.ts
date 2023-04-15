import { groupInvitationNames } from 'src/code/pages/computed/group-invitation-names';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { requestWithNotifications } from 'src/code/pages/utils';

export async function cancelJoinInvitation(input: {
  groupId: string;
  patientId: string;
}) {
  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),

    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    groupInvitationNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  await requestWithNotifications({
    url: `/api/groups/${input.groupId}/join-invitations/cancel`,

    body: {
      patientId: input.patientId,
    },

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
  });
}
