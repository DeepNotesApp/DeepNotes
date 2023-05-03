import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const encryptedPrivateKeyring: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: groupId, dataAbstraction }) =>
    await userHasPermission(dataAbstraction, userId, groupId, 'viewGroupPages'),

  columns: ['encrypted_private_keyring'],
};
