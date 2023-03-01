import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const publicKeyring: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['public_keyring'],
};
