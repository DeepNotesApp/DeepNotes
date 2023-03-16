import type { NotificationInfo } from './notifications.client';

export async function getGroupRequestAcceptedNotificationInfo({
  recipientType,

  groupName,
  agentName,
  targetName,
}: any): Promise<NotificationInfo> {
  if (recipientType === 'agent') {
    return {
      message: `You have accepted the request of ${targetName} to join the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your request to join the group ${groupName} was accepted.`,
      type: 'positive',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has accepted the request of ${targetName} to join the group ${groupName}.`,
      type: 'positive',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
