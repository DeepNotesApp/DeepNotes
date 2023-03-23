import type { NotificationInfo } from './notifications';

export async function getGroupMemberRemovedNotificationInfo({
  recipientType,

  removed,

  groupName,
  agentName,
  targetName,
}: any): Promise<NotificationInfo> {
  if (recipientType === 'agent') {
    return {
      message: removed
        ? `You removed ${targetName} from the group ${groupName}.`
        : `You left the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `You were removed from the group ${groupName}.`,
      type: 'negative',
    };
  } else if (recipientType === 'observer') {
    return {
      message: removed
        ? `${agentName} removed ${targetName} from the group ${groupName}.`
        : `${agentName} left the group ${groupName}.`,
      type: 'negative',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
