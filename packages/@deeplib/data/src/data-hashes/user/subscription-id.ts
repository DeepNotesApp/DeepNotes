import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const subscriptionId: DataField<UserModel> = {
  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['subscription_id'],
};
