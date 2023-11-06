import type { AppRouter } from '@deepnotes/app-server/src/trpc/router';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { once } from 'lodash';
import superjson from 'superjson';

let nodeFetch: () => Promise<typeof fetch>;

if (process.env.SERVER) {
  nodeFetch = once(
    async () => (await import('node-fetch')).default as unknown as typeof fetch,
  );
}

export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,

  links: [
    httpLink({
      url: process.env.APP_SERVER_URL,

      headers({ op }) {
        return {
          ...(op.context as any)?.headers,

          'X-Trpc-Context': op.context,
        };
      },

      async fetch(url, options) {
        // Extract context

        let context;

        if ((options?.headers as any)?.['X-Trpc-Context'] != null) {
          context = (options?.headers as any)?.['X-Trpc-Context'];

          delete (options?.headers as any)?.['X-Trpc-Context'];
        }

        // Fetch

        let response;

        if (process.env.SERVER) {
          response = await (await nodeFetch())(url, options);
        } else {
          response = await fetch(url, {
            ...options,

            credentials: 'include',
          });
        }

        // Pass SSR cookies to browser

        if (
          process.env.SERVER &&
          response.headers.has('set-cookie') &&
          context?.ssrContext != null
        ) {
          context.ssrContext.res.setHeader(
            'set-cookie',
            response.headers.get('set-cookie')!.split(/, (?=\w+=)/g),
          );
        }

        return response;
      },
    }),
  ],
});
