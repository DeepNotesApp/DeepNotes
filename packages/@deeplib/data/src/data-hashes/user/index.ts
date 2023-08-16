import { validateDataHash } from '@stdlib/data/src/universal';
import { once } from 'lodash';

import { customerId } from './customer-id';
import { demo } from './demo';
import { email } from './email';
import { encryptedDefaultArrow } from './encrypted-default-arrow';
import { encryptedDefaultNote } from './encrypted-default-note';
import { encryptedName } from './encrypted-name';
import { lastNotificationRead } from './last-notification-read';
import { newUser } from './new';
import { numFreePages } from './num-free-pages';
import { personalGroupId } from './personal-group-id';
import { plan } from './plan';
import { publicKeyring } from './public-keyring';
import { recentGroupIds } from './recent-group-ids';
import { recentPageIds } from './recent-page-ids';
import { startingPageId } from './starting-page-id';
import { subscriptionId } from './subscription-id';
import { twoFactorAuthEnabled } from './two-factor-auth-enabled';

const UserModel = once(
  async () =>
    (process.env.CLIENT ? null : (await import('@deeplib/db')).UserModel)!,
);

export const user = validateDataHash({
  model: UserModel,

  get: async ({ suffix: userId, columns, trx }) =>
    await (await UserModel()).query(trx).findById(userId).select(columns),
  set: async ({ suffix: userId, model, trx }) =>
    await (await UserModel()).query(trx).findById(userId).patch(model),

  fields: {
    'customer-id': customerId,
    demo: demo,
    email: email,
    'encrypted-default-arrow': encryptedDefaultArrow,
    'encrypted-default-note': encryptedDefaultNote,
    'encrypted-name': encryptedName,
    'last-notification-read': lastNotificationRead,
    'personal-group-id': personalGroupId,
    new: newUser,
    'num-free-pages': numFreePages,
    plan: plan,
    'public-keyring': publicKeyring,
    'recent-group-ids': recentGroupIds,
    'recent-page-ids': recentPageIds,
    'starting-page-id': startingPageId,
    'subscription-id': subscriptionId,
    'two-factor-auth-enabled': twoFactorAuthEnabled,
  },
});
