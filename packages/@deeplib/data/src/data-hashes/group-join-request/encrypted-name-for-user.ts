import type { GroupJoinRequestModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';
import { splitStr } from '@stdlib/misc';

export const encryptedNameForUser: DataField<GroupJoinRequestModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix }) =>
    userId === splitStr(suffix, ':', 2)[1],

  columns: ['encrypted_name_for_user'],
};
