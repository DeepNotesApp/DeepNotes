import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { decryptUserEmail, encryptUserEmail } from '../../emails';

export const email: DataField<UserModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['encrypted_email'],

  get: ({ model }) => decryptUserEmail(model?.encrypted_email!),
  set: ({ model, value }) => (model.encrypted_email = encryptUserEmail(value)),
};
