import { groupNames } from '../computed/group-names';
import type { NotificationInfo } from './notifications';

export async function getGroupRequestCanceledNotificationInfo({
  recipientType,

  groupId,

  agentName,
}: any): Promise<NotificationInfo> {
  const groupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You canceled your request to join the group ${groupName.text}.`,
      type: 'negative',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} canceled their request to join the group ${groupName.text}.`,
      type: 'negative',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
