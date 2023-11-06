import { validateDataHash } from '@stdlib/data/src/universal';
import { splitStr } from '@stdlib/misc';
import { once } from 'lodash';

import { encryptedName } from './encrypted-name';
import { encryptedNameForUser } from './encrypted-name-for-user';
import { exists } from './exists';
import { rejected } from './rejected';

const GroupJoinRequestModel = once(
  async () =>
    (process.env.CLIENT
      ? null
      : (await import('@deeplib/db')).GroupJoinRequestModel)!,
);

export const groupJoinRequest = validateDataHash({
  model: GroupJoinRequestModel,

  get: async ({ suffix, columns, trx }) =>
    await (
      await GroupJoinRequestModel()
    )
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .select(columns),
  set: async ({ suffix, model, trx }) =>
    await (
      await GroupJoinRequestModel()
    )
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .patch(model),

  fields: {
    'encrypted-name-for-user': encryptedNameForUser,
    'encrypted-name': encryptedName,
    exists: exists,
    rejected: rejected,
  },
});
