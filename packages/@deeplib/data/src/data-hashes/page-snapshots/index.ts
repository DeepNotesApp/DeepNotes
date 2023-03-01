import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { infos } from './infos';

const PageSnapshotModel = once(
  async () =>
    (process.env.CLIENT
      ? null
      : (await import('@deeplib/db')).PageSnapshotModel)!,
);

export const pageSnapshots = validateDataHash({
  model: PageSnapshotModel,

  get: async ({ suffix: pageId, trx }) =>
    await (await PageSnapshotModel())
      .query(trx)
      .where('page_id', pageId)
      .select('id', 'creation_date', 'author_id', 'type')
      .orderBy('creation_date', 'DESC'),

  fields: {
    infos: infos,
  },
});
