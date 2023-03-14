import { multiModePath } from '../utils.universal';
import { clearClientTokenExpirations } from './tokens.client';

export async function logout() {
  mainLogger().sub('logout').info('Logging out');

  const logoutPromise = api().post('/auth/logout');

  authStore().loggedIn = false;

  // Clear local storage

  internals.sessionStorage.removeItem('demo');

  internals.storage.removeItem('userId');
  internals.storage.removeItem('sessionId');
  internals.storage.removeItem('personalGroupId');

  internals.storage.removeItem('publicKeyring');
  internals.storage.removeItem('encryptedPrivateKeyring');
  internals.storage.removeItem('encryptedSymmetricKeyring');

  // Clear token expirations

  clearClientTokenExpirations();

  // Clear loggedIn cookie

  Cookies.remove('loggedIn', {
    domain: process.env.HOST,
    path: '/',
  });

  await (globalThis as any).electronBridge?.clearLoggedInCookie();

  try {
    await logoutPromise;
  } catch (error) {
    mainLogger().error(error);
  }

  location.href = multiModePath('/');
}
