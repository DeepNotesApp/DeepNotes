import { isIncluded } from '@stdlib/misc';
import type { AuthStore } from 'src/stores/auth';
import type { RouteLocationNormalized, Router } from 'vue-router';

import { trpcClient } from './trpc';
import { getRequestConfig } from './utils';

const moduleLogger = mainLogger.sub('routing.universal.ts');

export async function redirectIfNecessary(input: {
  router: Router;
  route: RouteLocationNormalized;
  auth: AuthStore;
  cookies?: typeof Cookies;
}) {
  const redirectDest = await getRedirectDest({
    route: input.route,
    auth: input.auth,
    cookies: input.cookies,
  });

  if (redirectDest != null) {
    moduleLogger.info(
      'redirectIfNecessary redirect: %s',
      JSON.stringify(redirectDest),
    );

    await input.router.replace(redirectDest);
  }
}

export async function getRedirectDest(input: {
  route: RouteLocationNormalized;
  auth: AuthStore;
  cookies?: typeof Cookies;
}) {
  // Page requires auth

  if (
    !input.auth.loggedIn &&
    input.route.matched.some((record) => record.meta.requiresAuth)
  ) {
    return { name: 'login', query: { redirect: input.route.fullPath } };
  }

  // Page requires guest

  if (
    input.auth.loggedIn &&
    input.route.matched.some((record) => record.meta.requiresGuest)
  ) {
    return {
      name: isIncluded(process.env.MODE, ['ssr', 'spa']) ? 'home' : 'pages',
    };
  }

  // Starting page redirection

  if (input.auth.loggedIn && input.route.name === 'pages') {
    try {
      const startingPageId =
        await trpcClient.users.pages.getStartingPageId.query(undefined, {
          context: getRequestConfig(input.cookies),
        });

      return { name: 'page', params: { pageId: startingPageId } };
    } catch (error) {
      moduleLogger.error('getRedirectDest error: %o', error);

      return { name: 'home' };
    }
  }

  // Group main page redirection

  if (input.route.name === 'group') {
    await trpcClient.groups.getMainPageId.query({
      groupId: input.route.params.groupId as string,
    });

    const mainPageId = await trpcClient.groups.getMainPageId.query({
      groupId: input.route.params.groupId as string,
    });

    if (mainPageId != null) {
      return { name: 'page', params: { pageId: mainPageId } };
    }
  }
}
