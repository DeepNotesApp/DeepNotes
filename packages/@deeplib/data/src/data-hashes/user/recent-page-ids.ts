import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const recentPageIds: DataField<UserModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['recent_page_ids'],
};
