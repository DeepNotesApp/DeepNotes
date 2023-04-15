import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';

export async function removeGroupUser(input: {
  groupId: string;
  patientId: string;
}) {
  const agentId = authStore().userId;

  const [groupName, agentName, targetName] = await Promise.all([
    groupNames()(input.groupId).getAsync(),

    groupMemberNames()(`${input.groupId}:${agentId}`).getAsync(),
    groupMemberNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  const notificationRecipients = (
    await api().post<{
      notificationRecipients: Record<string, { publicKeyring: string }>;
    }>(`/api/groups/${input.groupId}/remove-user/${input.patientId}`, {})
  ).data.notificationRecipients;

  await api().post(
    `/api/groups/${input.groupId}/remove-user/${input.patientId}`,
    {
      notifications: await createNotifications({
        recipients: notificationRecipients,

        patientId: input.patientId,

        notifications: {
          agent: {
            groupId: input.groupId,

            removed: agentId !== input.patientId,

            groupName: groupName.text,
            targetName: targetName.text,

            // You left the group.
            // You removed ${targetName} from the group.
          },

          ...(agentId !== input.patientId
            ? {
                target: {
                  groupId: input.groupId,

                  removed: true,

                  groupName: groupName.text,

                  // You were removed from the group.
                },
              }
            : {}),

          observers: {
            groupId: input.groupId,

            removed: agentId !== input.patientId,

            groupName: groupName.text,
            agentName: agentName.text,
            ...(agentId !== input.patientId
              ? { targetName: targetName.text }
              : {}),

            // ${agentName} left the group.
            // ${agentName} removed ${targetName} from the group.
          },
        },
      }),
    },
  );
}
