import {
  base64ToBytes,
  base64ToBytesSafe,
  bytesToBase64,
} from '@stdlib/base64';
import {
  createPrivateKeyring,
  createPublicKeyring,
  createSymmetricKeyring,
  wrapKeyPair,
  wrapSymmetricKey,
} from '@stdlib/crypto';

import { redirectIfNecessary } from '../routing.universal';
import { logout } from './logout.client';
import {
  areClientTokensExpiring,
  isClientTokenValid,
  storeClientTokenExpirations,
} from './tokens.client';

const moduleLogger = mainLogger().sub('auth/refresh.client.ts');

export async function tryRefreshTokens(): Promise<void> {
  if (!authStore().loggedIn) {
    return;
  }

  // Logout if a requirement is not met

  if (
    !isClientTokenValid('refresh') ||
    internals.storage.getItem('encryptedPrivateKeyring') == null ||
    internals.storage.getItem('encryptedSymmetricKeyring') == null
  ) {
    await logout();
    return;
  }

  // Skip refresh if unnecessary

  if (
    internals.keyPair != null &&
    internals.symmetricKeyring != null &&
    !areClientTokensExpiring()
  ) {
    return;
  }

  // Try to refresh tokens

  try {
    let response;

    if (authStore().oldSessionKey && authStore().newSessionKey) {
      moduleLogger.info(
        'Tokens already refreshed on server, skipping refresh request.',
      );
    } else {
      moduleLogger.info('Sending refresh request');

      response = (
        await api().post<{
          oldSessionKey: string;
          newSessionKey: string;
        }>('/auth/refresh')
      ).data;
    }

    // Reencrypt keys

    moduleLogger.info('Reencrypting keys');

    internals.personalGroupId = internals.storage.getItem('personalGroupId')!;

    const oldSessionKey = wrapSymmetricKey(
      base64ToBytes(authStore().oldSessionKey || response?.oldSessionKey!),
    );
    const newSessionKey = wrapSymmetricKey(
      base64ToBytes(authStore().newSessionKey || response?.newSessionKey!),
    );

    const publicKeyring = createPublicKeyring(
      base64ToBytesSafe(internals.storage.getItem('publicKeyring'))!,
    );

    const privateKeyring = createPrivateKeyring(
      base64ToBytes(internals.storage.getItem('encryptedPrivateKeyring')!),
    ).unwrapSymmetric(oldSessionKey);

    internals.keyPair = wrapKeyPair(publicKeyring, privateKeyring);

    internals.symmetricKeyring = createSymmetricKeyring(
      base64ToBytes(internals.storage.getItem('encryptedSymmetricKeyring')!),
    ).unwrapSymmetric(oldSessionKey);

    // Update storage

    internals.storage.setItem(
      'encryptedPrivateKeyring',
      bytesToBase64(privateKeyring.wrapSymmetric(newSessionKey).fullValue),
    );

    internals.storage.setItem(
      'encryptedSymmetricKeyring',
      bytesToBase64(
        internals.symmetricKeyring.wrapSymmetric(newSessionKey).fullValue,
      ),
    );

    // Finish refreshing tokens

    authStore().loggedIn = true;

    authStore().oldSessionKey = '';
    authStore().newSessionKey = '';

    storeClientTokenExpirations();

    moduleLogger.info('Tokens refreshed successfully');

    await redirectIfNecessary(router(), route().value, authStore());
  } catch (error) {
    if (authStore().oldSessionKey && authStore().newSessionKey) {
      moduleLogger.info('Failed refreshing tokens server session keys.');
      moduleLogger.info('Retrying without server session keys.');

      authStore().oldSessionKey = '';
      authStore().newSessionKey = '';

      await tryRefreshTokens();

      return;
    }

    moduleLogger.error('Failed to refresh tokens');
    moduleLogger.error(error);

    await logout();
  }
}
