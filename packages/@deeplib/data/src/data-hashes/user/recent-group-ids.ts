import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const recentGroupIds: DataField<UserModel> = {
  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['recent_group_ids'],
};
