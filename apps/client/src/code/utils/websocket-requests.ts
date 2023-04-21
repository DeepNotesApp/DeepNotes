import { Resolvable } from '@stdlib/misc';
import { pack, unpack } from 'msgpackr';

const moduleLogger = mainLogger.sub('Websocket endpoints');

function createWebsocketMessageHandler(input: {
  socket: WebSocket;
  steps: ((...args: any) => any)[];
  promise: Resolvable;
}) {
  let step = 1;

  return async (message: Uint8Array) => {
    try {
      moduleLogger.info('Received message %d', step);

      const response: {
        success: boolean;
        output: any;
        error?: string;
      } = unpack(message);

      if (!response.success) {
        input.socket.close();
        input.promise.reject(new Error(response.error));
        return;
      }

      const request = await input.steps[step - 1](response.output);

      if (++step === input.steps.length) {
        input.socket.close();
        input.promise.resolve();
        return;
      }

      input.socket.send(pack(request));
    } catch (error) {
      input.socket.close();
      input.promise.reject(error);
    }
  };
}

export function createWebsocketRequest(input: {
  url: string;
  steps: ((...args: any) => any)[];
}) {
  const promise = new Resolvable();

  const socket = new WebSocket(input.url);

  socket.binaryType = 'arraybuffer';

  socket.addEventListener('error', (event) => {
    moduleLogger.error('Websocket error: %o', event);
  });

  socket.addEventListener('open', async () => {
    const request = await input.steps[0]();

    socket.send(pack(request));
  });

  const messageHandler = createWebsocketMessageHandler({
    socket,
    steps: input.steps.slice(1),
    promise,
  });

  socket.addEventListener('message', async (event) => {
    await messageHandler(new Uint8Array(event.data));
  });

  return { promise };
}
