import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';
import type { DataPrefix } from '..';

export const encryptedRelativeTitle: DataField<PageModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroupPages',
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

  columns: ['encrypted_relative_title'],
};
