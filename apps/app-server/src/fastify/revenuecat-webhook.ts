import { mainLogger } from '@stdlib/misc';
import type Fastify from 'fastify';
import { createContext } from 'src/trpc/context';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const _webhookLogger = mainLogger.sub('app-store-webhook');

const baseProcedure = publicProcedure.input(
  z.object({
    api_version: z.string(),
    event: z.object({
      type: z.string(),

      app_user_id: z.string(),

      transferred_from: z.string().array().optional(),
      transferred_to: z.string().array().optional(),
    }),
  }),
);

export function registerRevenueCatWebhook(fastify: ReturnType<typeof Fastify>) {
  fastify.post('/revenuecat/webhook', {
    handler: async (req, res) => {
      const ctx = createContext({ req, res });

      return await webhook({ ctx, input: req.body as any });
    },
  });
}

export async function webhook({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  if (
    ctx.req.headers['authorization'] !==
    `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`
  ) {
    throw new Error('Unauthorized');
  }

  await ctx.dataAbstraction.transaction(async (dtrx) => {
    switch (input.event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await ctx.dataAbstraction.patch(
          'user',
          input.event.app_user_id,
          { plan: 'pro' },
          { dtrx },
        );

        break;
      case 'TRANSFER':
        await Promise.all([
          ...(input.event.transferred_from ?? []).map((userId) =>
            ctx.dataAbstraction.patch(
              'user',
              userId,
              { plan: 'basic' },
              { dtrx },
            ),
          ),

          ...(input.event.transferred_to ?? []).map((userId) =>
            ctx.dataAbstraction.patch(
              'user',
              userId,
              { plan: 'pro' },
              { dtrx },
            ),
          ),
        ]);

        break;
      case 'EXPIRATION':
        await ctx.dataAbstraction.patch(
          'user',
          input.event.app_user_id,
          { plan: 'basic' },
          { dtrx },
        );

        break;
    }
  });
}
