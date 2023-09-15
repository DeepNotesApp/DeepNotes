import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const isPersonal: DataField<GroupModel> = {
  cacheLocally: true, // Reason: Field never changes

  userGettable: () => true,

  columns: ['user_id'],

  get: ({ model }) => model?.user_id != null,
};
