import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKey } from '@stdlib/crypto';
import { createPrivateKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring, wrapSymmetricKey } from '@stdlib/crypto';

import { multiModePath } from '../utils.universal';
import { storeClientTokenExpirations } from './tokens.client';

export async function login({
  email,
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
  email: string;
  rememberSession: boolean;

  masterKey: SymmetricKey;

  userId: string;

  publicKeyring: string;
  encryptedPrivateKeyring: string;
  encryptedSymmetricKeyring: string;

  sessionId: string;
  sessionKey: string;

  personalGroupId: string;
}) {
  if (rememberSession) {
    internals.storage = internals.localStorage;
  } else {
    internals.storage = internals.sessionStorage;
  }

  if (email === 'demo') {
    internals.localStorage.setItem('demo', 'true');
  } else {
    internals.localStorage.removeItem('demo');
  }

  internals.storage.setItem('userId', userId);
  internals.storage.setItem('publicKeyring', publicKeyring);
  internals.storage.setItem('sessionId', sessionId);
  internals.storage.setItem('personalGroupId', personalGroupId);

  const wrappedSessionKey = wrapSymmetricKey(base64ToBytes(sessionKey));

  internals.storage.setItem(
    'encryptedPrivateKeyring',
    bytesToBase64(
      createPrivateKeyring(base64ToBytes(encryptedPrivateKeyring))
        .unwrapSymmetric(masterKey)
        .wrapSymmetric(wrappedSessionKey).fullValue,
    ),
  );
  internals.storage.setItem(
    'encryptedSymmetricKeyring',
    bytesToBase64(
      createSymmetricKeyring(base64ToBytes(encryptedSymmetricKeyring))
        .unwrapSymmetric(masterKey)
        .wrapSymmetric(wrappedSessionKey).fullValue,
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
