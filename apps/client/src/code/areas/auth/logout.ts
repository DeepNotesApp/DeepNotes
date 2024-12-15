import { clearCookie } from '../../cookies';
import { trpcClient } from '../../trpc';
import { multiModePath } from '../../utils/misc';
import { clearClientTokenExpirations } from './tokens';

export async function logout() {
  mainLogger.sub('logout').info('Logging out');

  const logoutPromise = trpcClient.sessions.logout.mutate();

  authStore().loggedIn = false;

  // Clear storage

  internals.sessionStorage.removeItem('demo');

  internals.storage.removeItem('userId');
  internals.storage.removeItem('sessionId');
  internals.storage.removeItem('personalGroupId');

  internals.storage.removeItem('publicKeyring');
  internals.storage.removeItem('encryptedPrivateKeyring');
  internals.storage.removeItem('encryptedSymmetricKeyring');

  // Clear token expirations

  clearClientTokenExpirations();

  // Clear loggedIn

  clearCookie('loggedIn');

  await (globalThis as any).electronBridge?.clearLoggedInCookie();

  internals.storage.removeItem('loggedIn');

  try {
    await logoutPromise;
  } catch (error) {
    mainLogger.error(error);
  }

  location.href = multiModePath('/');
}
