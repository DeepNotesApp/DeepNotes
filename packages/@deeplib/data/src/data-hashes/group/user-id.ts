import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<GroupModel> = {
  cacheLocally: true, // Reason: Field never changes

  columns: ['user_id'],
};
