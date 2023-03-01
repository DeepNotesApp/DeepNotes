import type { PageSnapshotModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const infos: DataField<PageSnapshotModel[]> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroup',
    ),

  get: ({ model }) =>
    model != null
      ? model.map((pageSnapshot) => ({
          id: pageSnapshot.id,
          creationDate: pageSnapshot.creation_date,
          authorId: pageSnapshot.author_id,
          type: pageSnapshot.type,
        }))
      : undefined,
};
