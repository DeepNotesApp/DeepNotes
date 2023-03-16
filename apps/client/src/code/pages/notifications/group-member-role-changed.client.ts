import type { NotificationInfo } from './notifications.client';

export async function getGroupMemberRoleChangedNotificationInfo({
  recipientType,

  groupName,
  agentName,
  targetName,
  roleName,
}: any): Promise<NotificationInfo> {
  if (recipientType === 'agent') {
    return {
      message: `You changed the role of ${targetName} to ${roleName} in the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your role was changed to ${roleName} in the group ${groupName}.`,
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} changed the role of ${targetName} to ${roleName} in the group ${groupName}.`,
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
