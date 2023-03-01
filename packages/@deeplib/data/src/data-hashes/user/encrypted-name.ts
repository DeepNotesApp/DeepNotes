import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const encryptedName: DataField<UserModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,
  userSettable: ({ userId, suffix }) => userId === suffix,

  columns: ['encrypted_name'],
};
