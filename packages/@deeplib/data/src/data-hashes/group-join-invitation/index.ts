import { validateDataHash } from '@stdlib/data/src/universal';
import { splitStr } from '@stdlib/misc';
import { once } from 'lodash';

import { encryptedName } from './encrypted-name';
import { encryptedNameForUser } from './encrypted-name-for-user';
import { exists } from './exists';
import { role } from './role';

const GroupJoinInvitationModel = once(
  async () =>
    (process.env.CLIENT
      ? null
      : (await import('@deeplib/db')).GroupJoinInvitationModel)!,
);

export const groupJoinInvitation = validateDataHash({
  model: GroupJoinInvitationModel,

  get: async ({ suffix, columns, trx }) =>
    await (await GroupJoinInvitationModel())
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .select(columns),
  set: async ({ suffix, model, trx }) =>
    await (await GroupJoinInvitationModel())
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .patch(model),

  fields: {
    'encrypted-name-for-user': encryptedNameForUser,
    'encrypted-name': encryptedName,
    exists: exists,
    role: role,
  },
});
