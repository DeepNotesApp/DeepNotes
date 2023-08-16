import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const plan: DataField<UserModel> = {
  cacheLocally: true, // Reason: Performance (Field is used a lot)
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['plan'],
};
