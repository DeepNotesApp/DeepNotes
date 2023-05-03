import { bytesToBase64 } from '@stdlib/base64';
import { route } from 'quasar/wrappers';
import { clearCookie } from 'src/code/cookies';
import { getRedirectDest } from 'src/code/routing';
import type { RouteLocationRaw } from 'vue-router';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';

const moduleLogger = mainLogger.sub('router/index.ts');

moduleLogger.info('Running module');

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(async function ({ store, ssrContext }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = router(
    createRouter({
      scrollBehavior: () => ({ left: 0, top: 0 }),
      routes,

      // Leave this as is and make changes in quasar.conf.js instead!
      // quasar.conf.js -> build -> vueRouterMode
      // quasar.conf.js -> build -> publicPath
      history: createHistory(process.env.VUE_ROUTER_BASE),
    }),
  );

  const auth = authStore(store);

  const cookies = process.env.SERVER ? Cookies.parseSSR(ssrContext) : Cookies;

  if (process.env.SERVER) {
    if (
      cookies.get('accessToken') &&
      cookies.get('refreshToken') &&
      cookies.get('loggedIn') === 'true'
    ) {
      try {
        moduleLogger.info('Refreshing tokens...');

        const response = await trpcClient.sessions.refresh.mutate(undefined, {
          context: {
            headers: {
              cookie: `refreshToken=${cookies.get(
                'refreshToken',
              )}; loggedIn=true`,
            },

            ssrContext,
          },
        });

        // Set auth values

        auth.oldSessionKey = bytesToBase64(response.oldSessionKey);
        auth.newSessionKey = bytesToBase64(response.newSessionKey);

        moduleLogger.info('Tokens refreshed successfully');

        auth.loggedIn = true;
        uiStore(store).loggedIn = true;
      } catch (error) {
        moduleLogger.error('Failed to refresh tokens: %s', error);

        clearCookie(cookies, 'accessToken');
        clearCookie(cookies, 'refreshToken');
        clearCookie(cookies, 'loggedIn');
      }
    }
  }

  Router.beforeEach(async (to, from, next) => {
    moduleLogger.info(
      'beforeEach (from: %s, to: %s)',
      from.fullPath,
      to.fullPath,
    );

    // Compute redirect

    let redirectDest: RouteLocationRaw | undefined = undefined;

    if (process.env.CLIENT && auth.redirect) {
      redirectDest = JSON.parse(auth.redirect);

      auth.redirect = '';
    } else {
      redirectDest = await getRedirectDest({
        route: to,
        auth,
        cookies,
      });
    }

    if (redirectDest != null) {
      // Redirect

      const redirectJSON = JSON.stringify(redirectDest);

      if (process.env.SERVER) {
        auth.redirect = redirectJSON;
      }

      moduleLogger.info('beforeEach redirect: %s', redirectJSON);

      next(redirectDest);
    } else {
      next();
    }
  });

  return Router;
});
