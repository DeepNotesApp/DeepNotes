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
  if (connection.socket.readyState !== connection.socket.OPEN) {
    return;
  }

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
  acquireLocks: (input) => any;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  let step = 1;

  // finishPromise is resolved after the last response is sent
  // it can be rejected at any time to abort the request

  const finishPromise = new Resolvable();

  finishPromise.catch((reason) =>
    sendErrorAndDisconnect(input.connection, reason),
  );

  const timeout = setTimeout(() => {
    finishPromise.reject('Websocket endpoint request timed out.');
  }, 10000);

  finishPromise.settle(() => {
    clearTimeout(timeout);
  });

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
          await input.acquireLocks(input_);
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
  lockCommunication: (input: {
    ctx: Exclude<Awaited<ReturnType<typeof authHelper>>, false>;
    input: Input;

    performCommunication(signals: RedlockAbortSignal[]): Promise<void>;
  }) => Promise<void>;
  procedures: [AnyProcedure, (...args: any) => any][];
}) {
  input.fastify.get(input.url, { websocket: true }, async (connection, req) => {
    const ctxReadyPromise = new Resolvable();

    try {
      moduleLogger.info(`Starting websocket request: ${input.url}`);

      connection.socket.on('message', async (message: Buffer) => {
        try {
          await ctxReadyPromise;

          await messageHandler.handle(message);
        } catch (error) {
          //
        }
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
        acquireLocks: (input_) => {
          const lockAcquisitionPromise = new Resolvable();

          void input
            .lockCommunication({
              ctx: ctx as any,
              input: input_,

              async performCommunication(signals: RedlockAbortSignal[]) {
                messageHandler.redlockSignals.push(...signals);

                // Locks acquired and signals added to the list
                // Now we can start communication
                lockAcquisitionPromise.resolve();

                await messageHandler.finishPromise;
              },
            })
            .catch((reason) => {
              moduleLogger.error(reason);

              lockAcquisitionPromise.reject(reason);

              sendErrorAndDisconnect(connection, reason);
            });

          return lockAcquisitionPromise;
        },
        procedures: input.procedures,
      });

      ctxReadyPromise.resolve();
    } catch (error: any) {
      moduleLogger.error(error);

      sendErrorAndDisconnect(connection, String(error));

      ctxReadyPromise.reject(error);
    }
  });
}
