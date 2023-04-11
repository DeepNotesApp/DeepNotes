import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from 'deepnotes-app-server-trpc';
import superjson from 'superjson';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,

  links: [
    httpBatchLink({
      url: process.env.APP_SERVER_TRPC_URL,

      maxURLLength: 2083, // Limit the number of requests in a batch

      // Request with cookies

      fetch(url, options) {
        return fetch(url, {
          ...options,

          credentials: 'include',
        });
      },
    }),
  ],
});
