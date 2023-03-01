import type { AccessTokenPayload } from '@deeplib/misc';
import cookie from 'cookie';
import type { IncomingMessage } from 'http';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { once } from 'lodash';
import type { Socket } from 'net';
import { wsServer } from 'src/ws-server';

import { mainLogger } from './logger';

const moduleLogger = mainLogger().sub('http-server.ts');

export const httpServer = once(() =>
  createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Okay');
  }),
);

httpServer().on('upgrade', (req: IncomingMessage, socket: Socket, head) => {
  const funcLogger = moduleLogger.sub('Upgrade');

  const cookies = cookie.parse(req.headers.cookie ?? '');

  funcLogger.info('Access token: %o', cookies['accessToken']);
  funcLogger.info('Logged in: %o', cookies['loggedIn']);

  if (cookies['accessToken'] != null && cookies['loggedIn'] === 'true') {
    try {
      const jwtPayload = jwt.verify(
        cookies['accessToken'],
        process.env.ACCESS_SECRET,
      ) as unknown as AccessTokenPayload;

      req.sessionId = jwtPayload.sid;

      moduleLogger.info(
        `${socket.remoteAddress}${req.url}: Authentication successful`,
      );
    } catch (error) {
      //
    }
  }

  if (req.sessionId == null) {
    moduleLogger.info(
      `${socket.remoteAddress}${req.url}: Unauthenticated connection`,
    );
  }

  wsServer().handleUpgrade(req, socket, head, (websocket) => {
    wsServer().emit('connection', websocket, req);
  });
});
