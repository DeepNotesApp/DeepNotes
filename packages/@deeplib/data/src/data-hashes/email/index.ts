import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { hashEmail } from '../../emails';
import { userId } from './user-id';

const UserModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).UserModel)!,
);

export const email = validateDataHash({
  model: UserModel,

  get: async ({ suffix: email, columns, trx }) =>
    await (
      await UserModel()
    )
      .query(trx)
      .where('email_hash', Buffer.from(hashEmail(email)))
      .select(columns)
      .first(),

  fields: {
    'user-id': userId,
  },
});
