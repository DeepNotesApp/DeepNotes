import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const publicKeyring: DataField<UserModel> = {
  userGettable: () => true,

  columns: ['public_keyring'],
};
