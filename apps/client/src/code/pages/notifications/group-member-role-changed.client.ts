export async function getGroupMemberRoleChangedNotificationInfo({
  recipientType,

  groupName,
  agentName,
  targetName,
  roleName,
}: any): Promise<{ type: string; message: string }> {
  if (recipientType === 'agent') {
    return {
      message: `You changed the role of ${targetName} to ${roleName} in the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'target') {
    return {
      message: `Your role was changed to ${roleName} in the group ${groupName}.`,
      type: 'positive',
    };
  } else if (recipientType === 'observer') {
    return {
      message: `${agentName} changed the role of ${targetName} to ${roleName} in the group ${groupName}.`,
      type: 'positive',
    };
  } else {
    throw new Error(`Unknown recipient type: ${recipientType}`);
  }
}
