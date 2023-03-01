import { sleep } from '@stdlib/misc';
import { boot } from 'quasar/wrappers';
import { tryRefreshTokens } from 'src/code/auth/refresh.client';

export default boot(async ({ store }) => {
  mainLogger().sub('boot/auth.client.ts').info('Booting');

  authStore(store).loggedIn ||= !!(await (
    globalThis as any
  ).electronBridge?.isLoggedIn());
  authStore(store).loggedIn ||= Cookies.get('loggedIn') === 'true';

  if (authStore(store).loggedIn && internals.storage.length === 0) {
    await sleep(500); // Required for cross-tab sessionStorage to work
  }

  authStore(store).userId = internals.storage.getItem('userId') ?? '';
  authStore(store).sessionId = internals.storage.getItem('sessionId') ?? '';

  // Try to refresh tokens

  await (async function refreshLoop() {
    await tryRefreshTokens();

    setTimeout(refreshLoop, 60000);
  })();

  // Start realtime client

  internals.realtime.connect();
});
