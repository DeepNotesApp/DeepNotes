import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const permanentDeletionDate: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: groupId, dataAbstraction }) =>
    await userHasPermission(dataAbstraction, userId, groupId, 'viewGroup'),

  columns: ['permanent_deletion_date'],
};
