import { validateDataHash } from '@stdlib/data/src/universal';
import { splitStr } from '@stdlib/misc';
import { once } from 'lodash';

import { lastParentId } from './last-parent-id';

const UserPageModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).UserPageModel)!,
);

export const userPage = validateDataHash({
  model: UserPageModel,

  get: async ({ suffix, columns, trx }) =>
    await (
      await UserPageModel()
    )
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .select(columns),
  set: async ({ suffix, model, trx }) => {
    const [userId, pageId] = splitStr(suffix, ':', 2);

    return await (
      await UserPageModel()
    )
      .query(trx)
      .insert({
        ...model,

        user_id: userId,
        page_id: pageId,
      })
      .onConflict(['user_id', 'page_id'] as (keyof InstanceType<
        Awaited<ReturnType<typeof UserPageModel>>
      >)[])
      .merge();
  },

  fields: {
    'last-parent-id': lastParentId,
  },
});
