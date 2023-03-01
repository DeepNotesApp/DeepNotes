import { validateDataHash } from '@stdlib/data/src/universal';
import { splitStr } from '@stdlib/misc';
import { once } from 'lodash';

import { encryptedAccessKeyring } from './encrypted-access-keyring';
import { encryptedInternalKeyring } from './encrypted-internal-keyring';
import { encryptedName } from './encrypted-name';
import { exists } from './exists';
import { role } from './role';

const GroupMemberModel = once(
  async () =>
    (process.env.CLIENT
      ? null
      : (await import('@deeplib/db')).GroupMemberModel)!,
);

export const groupMember = validateDataHash({
  model: GroupMemberModel,

  get: async ({ suffix, columns, trx }) =>
    await (await GroupMemberModel())
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .select(columns),
  set: async ({ suffix, model, trx }) =>
    await (await GroupMemberModel())
      .query(trx)
      .findById(splitStr(suffix, ':', 2))
      .patch(model),

  fields: {
    'encrypted-name': encryptedName,
    'encrypted-access-keyring': encryptedAccessKeyring,
    'encrypted-internal-keyring': encryptedInternalKeyring,
    exists: exists,
    role: role,
  },
});
