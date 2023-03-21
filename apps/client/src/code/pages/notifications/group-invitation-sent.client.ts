import { asyncPrompt, handleError } from 'src/code/utils.client';
import AcceptInvitationDialog from 'src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/AcceptInvitationDialog.vue';

import { acceptJoinInvitation } from '../operations/groups/join-invitations/accept';
import { rejectJoinInvitation } from '../operations/groups/join-invitations/reject';
import type { NotificationInfo } from './notifications.client';

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
              await asyncPrompt({
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
            $quasar()
              .dialog({ component: AcceptInvitationDialog })
              .onOk(async (userName) => {
                try {
                  await acceptJoinInvitation(groupId, {
                    userName,
                  });
                } catch (error: any) {
                  handleError(error);
                }
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
