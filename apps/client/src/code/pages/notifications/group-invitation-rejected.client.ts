import { groupNames } from '../computed/group-names.client';

export async function getGroupInvitationRejectedNotificationInfo({
  recipientType,

  groupId,

  agentName,
}: any): Promise<{ type: string; message: string }> {
  const groupName = await groupNames()(groupId).getAsync();

  if (recipientType === 'agent') {
    return {
      message: `You have rejected the invitation to join the group ${groupName.text}.`,
      type: 'negative',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} has rejected the invitation to join the group ${groupName.text}.`,
      type: 'negative',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
