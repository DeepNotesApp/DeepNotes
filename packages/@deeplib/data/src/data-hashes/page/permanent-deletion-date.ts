import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const permanentDeletionDate: DataField<PageModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroupPages',
    ),

  columns: ['permanent_deletion_date'],
};
