import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const encryptedContentKeyring: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: groupId, dataAbstraction }) =>
    await userHasPermission(dataAbstraction, userId, groupId, 'viewGroup', {
      publicGroups: true,
    }),

  columns: ['encrypted_content_keyring'],
};
