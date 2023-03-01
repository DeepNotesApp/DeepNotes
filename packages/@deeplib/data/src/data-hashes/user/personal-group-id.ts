import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const personalGroupId: DataField<UserModel> = {
  cacheLocally: true, // Never changes

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['personal_group_id'],
};
