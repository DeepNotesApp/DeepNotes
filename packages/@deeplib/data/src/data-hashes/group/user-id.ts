import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<GroupModel> = {
  cacheLocally: true, // Never changes

  columns: ['user_id'],
};
