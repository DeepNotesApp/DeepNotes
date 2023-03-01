import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';
import type { DataPrefix } from '..';

export const encryptedAbsoluteTitle: DataField<PageModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroup',
      { publicGroups: true },
    ),
  userSettable: async ({ userId, suffix: pageId, dataAbstraction }) => {
    const groupId = await dataAbstraction.hget<DataPrefix>(
      'page',
      pageId,
      'group-id',
    );

    return await userHasPermission(
      dataAbstraction,
      userId,
      groupId,
      'editGroupPages',
    );
  },

  columns: ['encrypted_absolute_title'],
};
