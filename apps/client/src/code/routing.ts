import { isIncluded } from '@stdlib/misc';
import type { AuthStore } from 'src/stores/auth';
import type { RouteLocationNormalized, Router } from 'vue-router';

import { trpcClient } from './trpc';
import { getRequestConfig } from './utils';

const moduleLogger = mainLogger().sub('routing.universal.ts');

export async function redirectIfNecessary(
  router: Router,
  route: RouteLocationNormalized,
  auth: AuthStore,
  cookies?: typeof Cookies,
) {
  const redirectDest = await getRedirectDest(route, auth, cookies);

  if (redirectDest != null) {
    moduleLogger.info(
      'redirectIfNecessary redirect: %s',
      JSON.stringify(redirectDest),
    );

    await router.replace(redirectDest);
  }
}

export async function getRedirectDest(
  route: RouteLocationNormalized,
  auth: AuthStore,
  cookies?: typeof Cookies,
) {
  // Page requires auth

  if (
    !auth.loggedIn &&
    route.matched.some((record) => record.meta.requiresAuth)
  ) {
    return { name: 'login', query: { redirect: route.fullPath } };
  }

  // Page requires guest

  if (
    auth.loggedIn &&
    route.matched.some((record) => record.meta.requiresGuest)
  ) {
    return {
      name: isIncluded(process.env.MODE, ['ssr', 'spa']) ? 'home' : 'pages',
    };
  }

  // Starting page redirection

  if (auth.loggedIn && route.name === 'pages') {
    try {
      const startingPageId = await trpcClient.users.getStartingPageId.query();

      return { name: 'page', params: { pageId: startingPageId } };
    } catch (error) {
      moduleLogger.error('getRedirectDest error: %o', error);

      return { name: 'home' };
    }
  }

  // Group main page redirection

  if (route.name === 'group') {
    const group = (
      await api().post<{ mainPageId: string }>(
        `/api/groups/${route.params.groupId}/main-page-id`,
        undefined,
        getRequestConfig(cookies),
      )
    ).data;

    if (group.mainPageId != null) {
      return { name: 'page', params: { pageId: group.mainPageId } };
    }
  }
}
