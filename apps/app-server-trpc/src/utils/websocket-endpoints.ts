import type { SocketStream } from '@fastify/websocket';
import { mainLogger, Resolvable } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import type { AnyProcedure } from '@trpc/server';
import type Fastify from 'fastify';
import { pack, unpack } from 'msgpackr';
import type { RedlockAbortSignal } from 'redlock';
import { createContext } from 'src/trpc/context';
import { authHelper } from 'src/trpc/helpers';

const moduleLogger = mainLogger.sub('Websocket endpoints');

export function createMessageHandler(input: {
  connection: SocketStream;
  ctx: () => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  let step = 0;

  const finishPromise = new Resolvable();

  const redlockSignals: RedlockAbortSignal[] = [];

  return {
    finishPromise,
    redlockSignals,

    handle: async (message: Buffer) => {
      if (step >= input.procedures.length) {
        input.connection.end();
        finishPromise.reject(new Error('Too many steps.'));
        return;
      }

      moduleLogger.info('Received step %d', step + 1);

      try {
        const input_ = (input.procedures[step][0]._def.inputs[0] as any).parse(
          unpack(message),
        );

        const output = await input.procedures[step][1]({
          ctx: input.ctx(),
          input: input_,
        });

        checkRedlockSignalAborted(redlockSignals);

        input.connection.socket.send(
          pack({
            success: true,

            output,
          }),
        );
      } catch (error: any) {
        const errorMessage = String(error?.message ?? error);

        input.connection.socket.send(
          pack({
            success: false,

            error: errorMessage,
          }),
        );

        input.connection.end();
        finishPromise.reject(errorMessage);
        return;
      }

      step++;

      if (step === input.procedures.length) {
        input.connection.end();
        finishPromise.resolve();
        return;
      }
    },
  };
}

export function createWebsocketEndpoint(input: {
  fastify: ReturnType<typeof Fastify>;
  url: string;
  setup: (input: {
    messageHandler: ReturnType<typeof createMessageHandler>;
    readyPromise: Resolvable;
    ctx: Exclude<Awaited<ReturnType<typeof authHelper>>, false>;
  }) => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  input.fastify.get(input.url, { websocket: true }, async (connection, req) => {
    try {
      const readyPromise = new Resolvable();

      const messageHandler = createMessageHandler({
        connection,
        ctx: () => ctx,
        procedures: input.procedures,
      });

      connection.socket.on('message', async (message: Buffer) => {
        await readyPromise;

        await messageHandler.handle(message);
      });

      const originalCtx = createContext({ req, res: null as any });

      const ctx = await authHelper({ ctx: originalCtx } as any);

      if (!ctx) {
        connection.end();
        return;
      }

      await input.setup({ messageHandler, readyPromise, ctx });
    } catch (error) {
      moduleLogger.error(error);

      connection.end();
    }
  });
}
