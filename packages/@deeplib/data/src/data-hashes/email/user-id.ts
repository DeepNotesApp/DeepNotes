import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<UserModel> = {
  userGettable: () => true,

  columns: ['id'],
};
