import type { DeepNotesNotification } from '@deeplib/misc';

import { getGroupInvitationAcceptedNotificationInfo } from './group-invitation-accepted.client';
import { getGroupInvitationCanceledNotificationInfo } from './group-invitation-canceled.client';
import { getGroupInvitationRejectedNotificationInfo } from './group-invitation-rejected.client';
import { getGroupInvitationSentNotificationInfo } from './group-invitation-sent.client';
import { getGroupMemberRemovedNotificationInfo } from './group-member-removed.client';
import { getGroupMemberRoleChangedNotificationInfo } from './group-member-role-changed.client';
import { getGroupRequestAcceptedNotificationInfo } from './group-request-accepted.client';
import { getGroupRequestCanceledNotificationInfo } from './group-request-canceled.client';
import { getGroupRequestRejectedNotificationInfo } from './group-request-rejected.client';
import { getGroupRequestSentNotificationInfo } from './group-request-sent.client';

export async function getNotificationInfo(
  notifObj: DeepNotesNotification,
  content: any,
) {
  if (notifObj.type === 'group-request-sent') {
    return await getGroupRequestSentNotificationInfo(content);
  } else if (notifObj.type === 'group-request-canceled') {
    return await getGroupRequestCanceledNotificationInfo(content);
  } else if (notifObj.type === 'group-request-accepted') {
    return await getGroupRequestAcceptedNotificationInfo(content);
  } else if (notifObj.type === 'group-request-rejected') {
    return await getGroupRequestRejectedNotificationInfo(content);
  } else if (notifObj.type === 'group-invitation-sent') {
    return await getGroupInvitationSentNotificationInfo(content);
  } else if (notifObj.type === 'group-invitation-canceled') {
    return await getGroupInvitationCanceledNotificationInfo(content);
  } else if (notifObj.type === 'group-invitation-rejected') {
    return await getGroupInvitationRejectedNotificationInfo(content);
  } else if (notifObj.type === 'group-invitation-accepted') {
    return await getGroupInvitationAcceptedNotificationInfo(content);
  } else if (notifObj.type === 'group-member-removed') {
    return await getGroupMemberRemovedNotificationInfo(content);
  } else if (notifObj.type === 'group-member-role-changed') {
    return await getGroupMemberRoleChangedNotificationInfo(content);
  } else {
    throw new Error(`Unknown notification type: ${notifObj.type}`);
  }
}
