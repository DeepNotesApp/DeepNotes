import { bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKey } from '@stdlib/crypto';
import { createPrivateKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring, wrapSymmetricKey } from '@stdlib/crypto';

import { multiModePath } from '../utils/misc';
import { storeClientTokenExpirations } from './tokens';

export async function login(input: {
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
  if (input.demo) {
    internals.localStorage.setItem('demo', 'true');
  } else {
    internals.localStorage.removeItem('demo');
  }

  if (input.rememberSession) {
    internals.storage = internals.localStorage;
  } else {
    internals.storage = internals.sessionStorage;
  }

  internals.storage.setItem('loggedIn', 'true');

  internals.storage.setItem('userId', input.userId);
  internals.storage.setItem(
    'publicKeyring',
    bytesToBase64(input.publicKeyring),
  );
  internals.storage.setItem('sessionId', input.sessionId);
  internals.storage.setItem('personalGroupId', input.personalGroupId);

  const wrappedSessionKey = wrapSymmetricKey(input.sessionKey);

  internals.storage.setItem(
    'encryptedPrivateKeyring',
    bytesToBase64(
      createPrivateKeyring(input.encryptedPrivateKeyring)
        .unwrapSymmetric(input.masterKey, {
          associatedData: {
            context: 'UserPrivateKeyring',
            userId: input.userId,
          },
        })
        .wrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserPrivateKeyring',
            userId: input.userId,
          },
        }).wrappedValue,
    ),
  );
  internals.storage.setItem(
    'encryptedSymmetricKeyring',
    bytesToBase64(
      createSymmetricKeyring(input.encryptedSymmetricKeyring)
        .unwrapSymmetric(input.masterKey, {
          associatedData: {
            context: 'UserSymmetricKeyring',
            userId: input.userId,
          },
        })
        .wrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserSymmetricKeyring',
            userId: input.userId,
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
