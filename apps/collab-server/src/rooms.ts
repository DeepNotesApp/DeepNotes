import { getSelfPublisherIdBytes } from '@stdlib/data';
import { bytesToText, equalUint8Arrays, splitStr } from '@stdlib/misc';
import type { WebSocket } from 'ws';

import { getSub } from './data/redis';
import { mainLogger } from './logger';

const moduleLogger = mainLogger().sub('rooms.ts');

export type AwarenessChanges = {
  added: number[];
  updated: number[];
  removed: number[];
};

export class Room {
  readonly name: string;

  readonly pageId: string;

  private readonly _sockets: Set<WebSocket> = new Set();

  setupPromise?: Promise<any>;

  constructor(name: string) {
    this.name = name;
    this.pageId = splitStr(name, ':', 2)[1];
  }

  async setup() {
    if (this.setupPromise != null) {
      return await this.setupPromise;
    }

    this.setupPromise = (async () => {
      await getSub().subscribe(this.name);
    })();

    return await this.setupPromise;
  }

  addSocket(socket: WebSocket) {
    this._sockets.add(socket);
  }
  removeSocket(socket: WebSocket) {
    this._sockets.delete(socket);

    if (this._sockets.size === 0) {
      this.destroy();
    }
  }

  broadcast(message: Uint8Array) {
    for (const socket of this._sockets) {
      socket.send(message);
    }
  }
  broadcastExcept(message: Uint8Array, exception: WebSocket) {
    for (const socket of this._sockets) {
      if (socket !== exception) {
        socket.send(message);
      }
    }
  }

  destroy() {
    rooms.delete(this.name);

    void getSub().unsubscribe(this.name);
  }
}

const rooms = new Map<string, Room>();

export function getRoom(name: string) {
  let room = rooms.get(name);

  if (room != null) {
    return room;
  }

  room = new Room(name);

  rooms.set(name, room);

  return room;
}

getSub().on('messageBuffer', (channelBuffer: Buffer, messageBuffer: Buffer) => {
  const channelStr = bytesToText(channelBuffer);

  if (
    !channelStr.startsWith('page:') ||
    equalUint8Arrays(
      messageBuffer.subarray(0, getSelfPublisherIdBytes().length),
      getSelfPublisherIdBytes(),
    )
  ) {
    return;
  }

  const broadcastMessage = messageBuffer.subarray(
    getSelfPublisherIdBytes().length,
  );

  moduleLogger.info(`[${channelStr}] Redis received message`);

  rooms.get(channelStr)?.broadcast(broadcastMessage);
});
