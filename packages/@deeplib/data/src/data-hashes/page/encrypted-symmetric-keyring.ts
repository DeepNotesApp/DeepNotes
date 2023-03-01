import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const encryptedSymmetricKeyring: DataField<PageModel> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroup',
      { publicGroups: true },
    ),

  columns: ['encrypted_symmetric_keyring'],
};
