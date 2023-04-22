import { rejectJoinRequest } from 'src/code/api-interface/groups/join-requests/reject';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import GroupSettingsDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/GroupSettingsDialog.vue';
import AcceptRequestDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/RequestsTab/AcceptRequestDialog.vue';

import { groupNames } from '../computed/group-names';
import type { NotificationInfo } from './notifications';

export async function getGroupRequestSentNotificationInfo({
  recipientType,

  groupId,

  agentId,
  agentName,
}: any): Promise<NotificationInfo> {
  const groupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You have sent a request to join the group ${groupName.text}.`,
      type: 'positive',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has sent a request to join the group ${groupName.text}.`,

      actions: [
        {
          label: 'Go to settings',

          color: 'primary',

          handler: async () => {
            await internals.pages.goToGroup(groupId);

            $quasar().dialog({
              component: GroupSettingsDialog,

              componentProps: {
                groupId,
                initialTab: 'Join requests',
              },
            });
          },
        },

        {
          label: 'Reject',

          color: 'red',

          handler: async () => {
            try {
              await asyncDialog({
                title: 'Reject join request',
                message: 'Are you sure you want to reject the join request?',

                focus: 'cancel',

                cancel: { label: 'No', flat: true, color: 'primary' },
                ok: { label: 'Yes', flat: true, color: 'negative' },
              });

              await rejectJoinRequest({
                groupId,
                patientId: agentId,
              });
            } catch (error) {
              handleError(error);
            }
          },
        },

        {
          label: 'Accept',

          color: 'green',

          handler: () =>
            $quasar().dialog({
              component: AcceptRequestDialog,

              componentProps: {
                groupId,
                userIds: [agentId],
              },
            }),
        },
      ],
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
