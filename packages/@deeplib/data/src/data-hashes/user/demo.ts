import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const demo: DataField<UserModel> = {
  cacheLocally: true, // Reason: Field never changes

  columns: ['demo'],
};
