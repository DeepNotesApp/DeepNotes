import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { invalidated } from './invalidated';
import { userId } from './user-id';

const SessionModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).SessionModel)!,
);

export const session = validateDataHash({
  model: SessionModel,

  get: async ({ suffix: sessionId, columns, trx }) =>
    await (await SessionModel()).query(trx).findById(sessionId).select(columns),
  set: async ({ suffix: sessionId, model, trx }) =>
    await (await SessionModel()).query(trx).findById(sessionId).patch(model),

  fields: {
    invalidated: invalidated,
    'user-id': userId,
  },
});
