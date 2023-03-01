import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const isPublic: DataField<GroupModel> = {
  cacheLocally: true, // For performance (Used a lot)
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['access_keyring'],

  get: ({ model }) => model?.access_keyring != null,
};
