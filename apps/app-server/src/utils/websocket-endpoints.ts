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

function sendErrorAndDisconnect(connection: SocketStream, error: string) {
  try {
    connection.socket.send(
      pack({
        success: false,

        error: error,
      }),
    );

    connection.end();
  } catch (error) {
    moduleLogger.error('Error while disconnecting websocket: %o', error);
  }
}

function createWebsocketMessageHandler(input: {
  connection: SocketStream;
  ctx: any;
  setup: (input) => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  let step = 1;

  const finishPromise = new Resolvable();

  finishPromise.catch((reason) =>
    sendErrorAndDisconnect(input.connection, reason),
  );

  const redlockSignals: RedlockAbortSignal[] = [];

  return {
    finishPromise,
    redlockSignals,

    async handle(message: Buffer) {
      try {
        moduleLogger.info('Received message %d', step);

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

        moduleLogger.info('Sending message %d', step);

        input.connection.socket.send(
          pack({
            success: true,

            output,
          }),
        );

        if (step === input.procedures.length) {
          input.connection.end();
          finishPromise.resolve();

          moduleLogger.info('Finished websocket request');
        }

        step++;
      } catch (error: any) {
        finishPromise.reject(String(error?.message ?? error));
      }
    },
  };
}

export function createWebsocketEndpoint<Input>(input: {
  fastify: ReturnType<typeof Fastify>;
  url: string;
  setup: (input: {
    ctx: Exclude<Awaited<ReturnType<typeof authHelper>>, false>;
    input: Input;

    run(signals: RedlockAbortSignal[]): Promise<void>;
  }) => Promise<void>;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  input.fastify.get(input.url, { websocket: true }, async (connection, req) => {
    try {
      moduleLogger.info(`Starting websocket request: ${input.url}`);

      const ctxReadyPromise = new Resolvable();

      connection.socket.on('message', async (message: Buffer) => {
        await ctxReadyPromise;

        await messageHandler.handle(message);
      });

      const originalCtx = createContext({ req, res: null as any });

      const ctx = await authHelper({ ctx: originalCtx } as any);

      if (!ctx) {
        sendErrorAndDisconnect(connection, 'Unauthorized.');

        return;
      }

      const messageHandler = createWebsocketMessageHandler({
        connection,
        ctx,
        setup: (input_) =>
          new Promise<void>((resolve) =>
            input
              .setup({
                ctx: ctx as any,
                input: input_,

                async run(signals: RedlockAbortSignal[]) {
                  messageHandler.redlockSignals.push(...signals);

                  resolve();

                  await messageHandler.finishPromise;
                },
              })
              .catch((error) => {
                sendErrorAndDisconnect(connection, String(error));
              }),
          ),
        procedures: input.procedures,
      });

      ctxReadyPromise.resolve();
    } catch (error: any) {
      moduleLogger.error(error);

      sendErrorAndDisconnect(connection, String(error));
    }
  });
}
