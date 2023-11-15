import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { accessKeyring } from './access-keyring';
import { areJoinRequestsAllowed } from './are-join-requests-allowed';
import { encryptedContentKeyring } from './encrypted-content-keyring';
import { encryptedName } from './encrypted-name';
import { encryptedPrivateKeyring } from './encrypted-private-keyring';
import { isPasswordProtected } from './is-password-protected';
import { isPersonal } from './is-personal';
import { isPublic } from './is-public';
import { mainPageId } from './main-page-id';
import { permanentDeletionDate } from './permanent-deletion-date';
import { publicKeyring } from './public-keyring';
import { userId } from './user-id';

const GroupModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).GroupModel)!,
);

export const group = validateDataHash({
  model: GroupModel,

  get: async ({ suffix: groupId, columns, trx }) =>
    await (await GroupModel()).query(trx).findById(groupId).select(columns),
  set: async ({ suffix: groupId, model, trx }) =>
    await (await GroupModel()).query(trx).findById(groupId).patch(model),

  fields: {
    'access-keyring': accessKeyring,
    'encrypted-content-keyring': encryptedContentKeyring,
    'encrypted-name': encryptedName,
    'encrypted-private-keyring': encryptedPrivateKeyring,
    'is-password-protected': isPasswordProtected,
    'is-personal': isPersonal,
    'is-public': isPublic,
    'main-page-id': mainPageId,
    'permanent-deletion-date': permanentDeletionDate,
    'public-keyring': publicKeyring,
    'user-id': userId,
    'are-join-requests-allowed': areJoinRequestsAllowed,
  },
});
