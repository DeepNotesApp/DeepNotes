import type { DeepNotesNotification } from '@deeplib/misc';
import type { QNotifyCreateOptions } from 'quasar';

import { getGroupInvitationAcceptedNotificationInfo } from './group-invitation-accepted';
import { getGroupInvitationCanceledNotificationInfo } from './group-invitation-canceled';
import { getGroupInvitationRejectedNotificationInfo } from './group-invitation-rejected';
import { getGroupInvitationSentNotificationInfo } from './group-invitation-sent';
import { getGroupMemberRemovedNotificationInfo } from './group-member-removed';
import { getGroupMemberRoleChangedNotificationInfo } from './group-member-role-changed';
import { getGroupRequestAcceptedNotificationInfo } from './group-request-accepted';
import { getGroupRequestCanceledNotificationInfo } from './group-request-canceled';
import { getGroupRequestRejectedNotificationInfo } from './group-request-rejected';
import { getGroupRequestSentNotificationInfo } from './group-request-sent';

export type NotificationInfo = QNotifyCreateOptions;

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
