import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const isPasswordProtected: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['encrypted_rehashed_password_hash'],

  get: ({ model }) => model?.encrypted_rehashed_password_hash != null,
};
