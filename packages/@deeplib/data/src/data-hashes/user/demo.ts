import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const demo: DataField<UserModel> = {
  cacheLocally: true, // Never changes

  columns: ['demo'],
};
