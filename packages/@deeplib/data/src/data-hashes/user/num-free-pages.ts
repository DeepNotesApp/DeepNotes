import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const numFreePages: DataField<UserModel> = {
  columns: ['num_free_pages'],
};
