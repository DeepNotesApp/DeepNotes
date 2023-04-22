import { rejectJoinInvitation } from 'src/code/api-interface/groups/join-invitations/reject';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import AcceptInvitationDialog from 'src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/AcceptInvitationDialog.vue';

import type { NotificationInfo } from './notifications';

export async function getGroupInvitationSentNotificationInfo({
  recipientType,

  groupId,

  groupName,
  agentName,
  targetName,
}: any): Promise<NotificationInfo> {
  if (recipientType === 'agent') {
    return {
      message: `You invited ${targetName} to join the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your were invited to join the group ${groupName}.`,

      actions: [
        {
          label: 'Go to group',

          color: 'primary',

          handler: () => internals.pages.goToGroup(groupId),
        },

        {
          label: 'Reject',

          color: 'red',

          handler: async () => {
            try {
              await asyncDialog({
                title: 'Reject join invitation',
                message: 'Are you sure you want to reject the join invitation?',

                focus: 'cancel',

                cancel: { label: 'No', flat: true, color: 'primary' },
                ok: { label: 'Yes', flat: true, color: 'negative' },
              });

              await rejectJoinInvitation(groupId);
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
              component: AcceptInvitationDialog,

              componentProps: {
                groupIds: [groupId],
              },
            }),
        },
      ],
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} invited ${targetName} to join the group ${groupName}.`,
      type: 'positive',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
