import type { GroupMemberModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';
import { splitStr } from '@stdlib/misc';

export const encryptedAccessKeyring: DataField<GroupMemberModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === splitStr(suffix, ':', 2)[1],

  columns: ['encrypted_access_keyring'],
};
