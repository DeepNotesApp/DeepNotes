import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const newUser: DataField<UserModel> = {
  userGettable: ({ userId, suffix }) => userId === suffix,
  userSettable: ({ userId, suffix }) => userId === suffix,

  columns: ['new'],
};
