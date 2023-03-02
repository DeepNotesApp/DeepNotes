import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<UserModel> = {
  cacheLocally: true, // Never changes

  columns: ['id'],
};
