import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { encryptedAbsoluteTitle } from './encrypted-absolute-title';
import { encryptedRelativeTitle } from './encrypted-relative-title';
import { encryptedSymmetricKeyring } from './encrypted-symmetric-keyring';
import { free } from './free';
import { groupId } from './group-id';
import { nextKeyRotationDate } from './next-key-rotation-date';
import { nextSnapshotDate } from './next-snapshot-date';
import { nextSnapshotUpdateIndex } from './next-snapshot-update-index';
import { permanentDeletionDate } from './permanent-deletion-date';

const PageModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).PageModel)!,
);

export const page = validateDataHash({
  model: PageModel,

  get: async ({ suffix: pageId, columns, trx }) =>
    await (await PageModel()).query(trx).findById(pageId).select(columns),
  set: async ({ suffix: pageId, model, trx }) =>
    await (await PageModel()).query(trx).findById(pageId).patch(model),

  fields: {
    'encrypted-absolute-title': encryptedAbsoluteTitle,
    'encrypted-symmetric-keyring': encryptedSymmetricKeyring,
    'encrypted-relative-title': encryptedRelativeTitle,
    'group-id': groupId,
    free: free,
    'next-key-rotation-date': nextKeyRotationDate,
    'next-snapshot-date': nextSnapshotDate,
    'next-snapshot-update-index': nextSnapshotUpdateIndex,
    'permanent-deletion-date': permanentDeletionDate,
  },
});
