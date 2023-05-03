import type { PageLinkModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

import { userHasPermission } from '../../roles';

export const list: DataField<PageLinkModel[]> = {
  notifyUpdates: true,

  userGettable: async ({ userId, suffix: pageId, dataAbstraction }) =>
    await userHasPermission(
      dataAbstraction,
      userId,
      await dataAbstraction.hget('page', pageId, 'group-id'),
      'viewGroupPages',
    ),

  get: ({ model }) =>
    model != null
      ? model.map((backlinkPage) => backlinkPage.source_page_id)
      : undefined,
};
