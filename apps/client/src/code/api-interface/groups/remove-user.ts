import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';

export async function removeGroupUser(
  groupId: string,
  { patientId }: { patientId: string },
) {
  const agentId = authStore().userId;

  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(groupId).getAsync(),

    groupMemberNames()(`${groupId}:${agentId}`).getAsync(),
    groupMemberNames()(`${groupId}:${patientId}`).getAsync(),
  ]);

  const notificationRecipients = (
    await api().post<{
      notificationRecipients: Record<string, { publicKeyring: string }>;
    }>(`/api/groups/${groupId}/remove-user/${patientId}`, {})
  ).data.notificationRecipients;

  await api().post(`/api/groups/${groupId}/remove-user/${patientId}`, {
    notifications: await createNotifications({
      recipients: notificationRecipients,

      patientId,

      notifications: {
        agent: {
          groupId,

          removed: agentId !== patientId,

          groupName: groupName.text,
          targetName: targetName.text,

          // You left the group.
          // You removed ${targetName} from the group.
        },

        ...(agentId !== patientId
          ? {
              target: {
                groupId,

                removed: true,

                groupName: groupName.text,

                // You were removed from the group.
              },
            }
          : {}),

        observers: {
          groupId,

          removed: agentId !== patientId,

          groupName: groupName.text,
          agentName: agentName.text,
          ...(agentId !== patientId ? { targetName: targetName.text } : {}),

          // ${agentName} left the group.
          // ${agentName} removed ${targetName} from the group.
        },
      },
    }),
  });
}
