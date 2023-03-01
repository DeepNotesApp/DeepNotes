import type { UserPageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';
import { splitStr } from '@stdlib/misc';

export const lastParentId: DataField<UserPageModel> = {
  userGettable: ({ userId, suffix }) => userId === splitStr(suffix, ':', 2)[0],

  columns: ['last_parent_id'],
};
