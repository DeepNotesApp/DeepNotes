import { groupNames } from '../computed/group-names.client';
import type { NotificationInfo } from './notifications.client';

export async function getGroupInvitationAcceptedNotificationInfo({
  recipientType,

  groupId,

  agentName,
}: any): Promise<NotificationInfo> {
  const groupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You have accepted the invitation to join the group ${groupName.text}.`,
      type: 'positive',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has accepted the invitation to join the group ${groupName.text}.`,
      type: 'positive',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
