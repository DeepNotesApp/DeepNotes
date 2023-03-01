import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const twoFactorAuthEnabled: DataField<UserModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['two_factor_auth_enabled'],
};
