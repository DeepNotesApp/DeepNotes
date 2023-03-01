import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const lastNotificationRead: DataField<UserModel> = {
  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['last_notification_read'],
};
