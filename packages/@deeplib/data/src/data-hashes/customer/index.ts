import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { userId } from './user-id';

const UserModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).UserModel)!,
);

export const customer = validateDataHash({
  model: UserModel,

  get: async ({ suffix: customerId, columns, trx }) =>
    await (await UserModel())
      .query(trx)
      .where('customer_id', customerId)
      .select(columns)
      .first(),

  fields: {
    'user-id': userId,
  },
});
