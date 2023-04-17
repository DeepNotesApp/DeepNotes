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

function createWebsocketMessageHandler(input: {
  connection: SocketStream;
  ctx: any;
  setup: (input) => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  let step = 1;

  const finishPromise = new Resolvable();

  const redlockSignals: RedlockAbortSignal[] = [];

  return {
    finishPromise,
    redlockSignals,

    async handle(message: Buffer) {
      if (step >= input.procedures.length) {
        input.connection.end();
        finishPromise.reject(new Error('Unexpected step.'));
        return;
      }

      moduleLogger.info('Received step %d', step);

      try {
        const input_ = (
          input.procedures[step - 1][0]._def.inputs[0] as any
        ).parse(unpack(message));

        if (step === 1) {
          await input.setup(input_);
        }

        const output = await input.procedures[step - 1][1]({
          ctx: input.ctx,
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

      if (step === input.procedures.length) {
        input.connection.end();
        finishPromise.resolve();
        return;
      }

      step++;
    },
  };
}

export function createWebsocketEndpoint(input: {
  fastify: ReturnType<typeof Fastify>;
  url: string;
  setup: (input: {
    messageHandler: ReturnType<typeof createWebsocketMessageHandler>;
    ctx: Exclude<Awaited<ReturnType<typeof authHelper>>, false>;
    input: any;
  }) => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  input.fastify.get(input.url, { websocket: true }, async (connection, req) => {
    try {
      const ctxReadyPromise = new Resolvable();

      connection.socket.on('message', async (message: Buffer) => {
        await ctxReadyPromise;

        await messageHandler.handle(message);
      });

      const originalCtx = createContext({ req, res: null as any });

      const ctx = await authHelper({ ctx: originalCtx } as any);

      if (!ctx) {
        connection.socket.send(
          pack({
            success: false,

            error: 'Invalid access token.',
          }),
        );

        connection.end();
        return;
      }

      const messageHandler = createWebsocketMessageHandler({
        connection,
        ctx,
        setup: (input_) =>
          input.setup({
            messageHandler: messageHandler!,
            ctx: ctx as any,
            input: input_,
          }),
        procedures: input.procedures,
      });

      ctxReadyPromise.resolve();
    } catch (error: any) {
      moduleLogger.error(error);

      connection.socket.send(
        pack({
          success: false,

          error: String(error?.message ?? error),
        }),
      );

      connection.end();
    }
  });
}
