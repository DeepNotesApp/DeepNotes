export async function getGroupInvitationSentNotificationInfo({
  recipientType,

  groupName,
  agentName,
  targetName,
}: any): Promise<{ type: string; message: string }> {
  if (recipientType === 'agent') {
    return {
      message: `You invited ${targetName} to join the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your were invited to join the group ${groupName}.`,
      type: 'positive',
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
