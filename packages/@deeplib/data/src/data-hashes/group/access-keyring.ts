import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const accessKeyring: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['access_keyring'],
};
