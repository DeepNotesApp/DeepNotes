import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const userId: DataField<UserModel> = {
  dontCache: true,

  userGettable: () => true,

  columns: ['id'],
};
