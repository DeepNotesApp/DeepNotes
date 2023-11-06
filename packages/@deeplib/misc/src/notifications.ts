export const notificationTypes = [
  'group-request-sent',
  'group-request-canceled',
  'group-request-accepted',
  'group-request-rejected',
  'group-invitation-sent',
  'group-invitation-canceled',
  'group-invitation-accepted',
  'group-invitation-rejected',
  'group-member-role-changed',
  'group-member-removed',
] as const;

export type DeepNotesNotificationType = (typeof notificationTypes)[number];

export interface DeepNotesNotification {
  id: number;

  type: DeepNotesNotificationType;

  encryptedSymmetricKey: Uint8Array;
  encryptedContent: Uint8Array;

  dateTime: Date;
}
