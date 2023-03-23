import { groupNames } from '../computed/group-names';
import type { NotificationInfo } from './notifications';

export async function getGroupInvitationCanceledNotificationInfo({
  recipientType,

  groupId,

  groupName,
  agentName,
  targetName,
}: any): Promise<NotificationInfo> {
  const targetGroupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You have canceled the invitation of ${targetName} to join the group ${groupName}.`,
      type: 'negative',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your invitation to join the group ${targetGroupName.text} was cancelled.`,
      type: 'negative',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has canceled the invitation of ${targetName} to join the group ${groupName}.`,
      type: 'negative',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
