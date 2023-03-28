import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const encryptedName: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: groupId, dataAbstraction }) =>
    await userHasPermission(dataAbstraction, userId, groupId, 'viewGroup'),
  userSettable: async ({ userId, suffix: groupId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      groupId,
      'editGroupSettings',
    ),

  columns: ['encrypted_name'],
};
