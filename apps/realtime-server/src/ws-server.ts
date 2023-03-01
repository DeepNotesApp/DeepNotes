import { once } from 'lodash';
import { SocketAuxObject } from 'src/sockets';
import { Server } from 'ws';

import { mainLogger } from './logger';

const moduleLogger = mainLogger().sub('ws-server.ts');

export const wsServer = once(() => new Server({ noServer: true }));

wsServer().on('error', (error) => {
  moduleLogger.error('Server error: %o', error);
});

wsServer().on('connection', async (socket, req) => {
  try {
    socket.aux = new SocketAuxObject(socket, req);

    await socket.aux.setup();
  } catch (error) {
    moduleLogger.error('Connection error: %o', error);
  }
});

// Detect and close broken connections

setInterval(async () => {
  for (const socket of wsServer().clients) {
    if (socket.aux == null) {
      continue;
    }

    if (socket.aux.isAwaitingPong) {
      socket.aux.destroySocket();
      continue;
    }

    socket.aux.isAwaitingPong = true;
    socket.ping();
  }
}, 30000);
