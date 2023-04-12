import { bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKey } from '@stdlib/crypto';
import { createPrivateKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring, wrapSymmetricKey } from '@stdlib/crypto';

import { multiModePath } from '../utils';
import { storeClientTokenExpirations } from './tokens';

export async function login({
  demo,

  rememberSession,

  masterKey,

  userId,

  publicKeyring,
  encryptedPrivateKeyring,
  encryptedSymmetricKeyring,

  sessionId,
  sessionKey,

  personalGroupId,
}: {
  demo?: boolean;

  rememberSession: boolean;

  masterKey: SymmetricKey;

  userId: string;

  publicKeyring: Uint8Array;
  encryptedPrivateKeyring: Uint8Array;
  encryptedSymmetricKeyring: Uint8Array;

  sessionId: string;
  sessionKey: Uint8Array;

  personalGroupId: string;
}) {
  if (demo) {
    internals.localStorage.setItem('demo', 'true');
  } else {
    internals.localStorage.removeItem('demo');
  }

  if (rememberSession) {
    internals.storage = internals.localStorage;
  } else {
    internals.storage = internals.sessionStorage;
  }

  internals.storage.setItem('userId', userId);
  internals.storage.setItem('publicKeyring', bytesToBase64(publicKeyring));
  internals.storage.setItem('sessionId', sessionId);
  internals.storage.setItem('personalGroupId', personalGroupId);

  const wrappedSessionKey = wrapSymmetricKey(sessionKey);

  internals.storage.setItem(
    'encryptedPrivateKeyring',
    bytesToBase64(
      createPrivateKeyring(encryptedPrivateKeyring)
        .unwrapSymmetric(masterKey, {
          associatedData: {
            context: 'UserPrivateKeyring',
            userId,
          },
        })
        .wrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserPrivateKeyring',
            userId,
          },
        }).wrappedValue,
    ),
  );
  internals.storage.setItem(
    'encryptedSymmetricKeyring',
    bytesToBase64(
      createSymmetricKeyring(encryptedSymmetricKeyring)
        .unwrapSymmetric(masterKey, {
          associatedData: {
            context: 'UserSymmetricKeyring',
            userId,
          },
        })
        .wrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserSymmetricKeyring',
            userId,
          },
        }).wrappedValue,
    ),
  );

  storeClientTokenExpirations();

  $quasar().notify({
    message: 'Logged in successfully.',
    type: 'positive',
  });

  if (route().value.query.redirect != null) {
    location.href = multiModePath(
      decodeURIComponent(route().value.query.redirect as string),
    );
  } else {
    location.href = multiModePath('/pages');
  }
}
