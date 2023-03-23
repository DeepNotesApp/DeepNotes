import { groupNames } from '../computed/group-names';
import type { NotificationInfo } from './notifications';

export async function getGroupRequestRejectedNotificationInfo({
  recipientType,

  groupId,

  groupName,
  agentName,
  targetName,
}: any): Promise<NotificationInfo> {
  const targetGroupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You rejected the request of ${targetName} to join the group ${groupName}.`,
      type: 'negative',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your request to join the group ${targetGroupName.text} was rejected.`,
      type: 'negative',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} rejected the request of ${targetName} to join the group ${groupName}.`,
      type: 'negative',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
