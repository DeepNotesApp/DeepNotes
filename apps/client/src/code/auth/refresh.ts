import {
  base64ToBytes,
  base64ToBytesSafe,
  bytesToBase64,
} from '@stdlib/base64';
import type { SymmetricKey } from '@stdlib/crypto';
import {
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapKeyPair,
  wrapSymmetricKey,
} from '@stdlib/crypto';

import { redirectIfNecessary } from '../routing';
import { trpcClient } from '../trpc';
import { logout } from './logout';
import {
  areClientTokensExpiring,
  isClientTokenValid,
  storeClientTokenExpirations,
} from './tokens';

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
    let oldSessionKey: SymmetricKey;
    let newSessionKey: SymmetricKey;

    if (authStore().oldSessionKey && authStore().newSessionKey) {
      moduleLogger.info(
        'Tokens already refreshed on server, skipping refresh request.',
      );

      oldSessionKey = wrapSymmetricKey(
        base64ToBytes(authStore().oldSessionKey),
      );
      newSessionKey = wrapSymmetricKey(
        base64ToBytes(authStore().newSessionKey),
      );
    } else {
      moduleLogger.info('Sending refresh request');

      const response = await trpcClient.sessions.refresh.mutate(undefined);

      oldSessionKey = wrapSymmetricKey(response.oldSessionKey);
      newSessionKey = wrapSymmetricKey(response.newSessionKey);
    }

    // Reencrypt keys

    moduleLogger.info('Reencrypting keys');

    internals.personalGroupId = internals.storage.getItem('personalGroupId')!;

    const publicKeyring = createKeyring(
      base64ToBytesSafe(internals.storage.getItem('publicKeyring'))!,
    );

    const privateKeyring = createPrivateKeyring(
      base64ToBytes(internals.storage.getItem('encryptedPrivateKeyring')!),
    ).unwrapSymmetric(oldSessionKey, {
      associatedData: {
        context: 'SessionUserPrivateKeyring',
        userId: authStore().userId,
      },
    });

    internals.keyPair = wrapKeyPair(publicKeyring, privateKeyring);

    internals.symmetricKeyring = createSymmetricKeyring(
      base64ToBytes(internals.storage.getItem('encryptedSymmetricKeyring')!),
    ).unwrapSymmetric(oldSessionKey, {
      associatedData: {
        context: 'SessionUserSymmetricKeyring',
        userId: authStore().userId,
      },
    });

    // Update storage

    internals.storage.setItem(
      'encryptedPrivateKeyring',
      bytesToBase64(
        privateKeyring.wrapSymmetric(newSessionKey, {
          associatedData: {
            context: 'SessionUserPrivateKeyring',
            userId: authStore().userId,
          },
        }).wrappedValue,
      ),
    );

    internals.storage.setItem(
      'encryptedSymmetricKeyring',
      bytesToBase64(
        internals.symmetricKeyring.wrapSymmetric(newSessionKey, {
          associatedData: {
            context: 'SessionUserSymmetricKeyring',
            userId: authStore().userId,
          },
        }).wrappedValue,
      ),
    );

    // Finish refreshing tokens

    authStore().loggedIn = true;

    authStore().oldSessionKey = '';
    authStore().newSessionKey = '';

    storeClientTokenExpirations();

    moduleLogger.info('Tokens refreshed successfully');

    await redirectIfNecessary({
      router: router(),
      route: route().value,
      auth: authStore(),
    });
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
