import { groupNames } from '../computed/group-names.client';

export async function getGroupRequestSentNotificationInfo({
  recipientType,

  groupId,

  agentName,
}: any): Promise<{ type: string; message: string }> {
  const groupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You have sent a request to join the group ${groupName.text}.`,
      type: 'positive',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has sent a request to join the group ${groupName.text}.`,
      type: 'positive',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
