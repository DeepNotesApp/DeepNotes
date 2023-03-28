import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { list } from './list';

const PageLinkModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).PageLinkModel)!,
);

export const pageBacklinks = validateDataHash({
  model: PageLinkModel,

  get: async ({ suffix: pageId, trx }) =>
    await (await PageLinkModel())
      .query(trx)
      .where('target_page_id', pageId)
      .orderBy('last_activity_date', 'DESC')
      .select('source_page_id'),

  fields: {
    list,
  },
});
