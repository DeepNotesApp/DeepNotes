import type { DataPrefix } from '@deeplib/data';
import { dataHashes } from '@deeplib/data';
import {
  RealtimeClientMessageType,
  RealtimeCommandType,
  RealtimeServerMessageType,
} from '@deeplib/misc';
import type { DataHash, DataUpdateListener } from '@stdlib/data';
import { bytesToText, getFullKey } from '@stdlib/misc';
import {
  allAsyncProps,
  objectifyPromiseResults,
  Resolvable,
  splitStr,
} from '@stdlib/misc';
import { mainLogger } from '@stdlib/misc';
import type { IncomingMessage } from 'http';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { debounce } from 'lodash';
import { pack, unpack } from 'msgpackr';
import type { WebSocket } from 'ws';

import { dataAbstraction } from './data/data-abstraction';
import { getSub } from './data/redis';

const moduleLogger = mainLogger.sub('sockets.ts');

interface RealtimeCommand {
  id: number;
  type: number;
  args: any;
}
export class SocketAuxObject {
  readonly socket: WebSocket;

  readonly sessionId?: string;

  private _setupPromise?: Resolvable; // Necessary to delay message handling

  isAwaitingPong = false;

  userId?: string;

  private readonly _listeners = new Map<string, DataUpdateListener>();

  private _hGetBuffer: [string, string, string, Resolvable<any>][] = [];
  private _hSetBuffer: [DataPrefix, string, string, any, Resolvable<void>][] =
    [];
  private readonly _dataNotificationBuffer: [
    DataPrefix,
    string,
    string,
    any,
  ][] = [];

  constructor(socket: WebSocket, req: IncomingMessage) {
    this.socket = socket;

    this.sessionId = req.sessionId;

    socket.on('message', async (message: ArrayBuffer) => {
      try {
        await this._setupPromise;

        await this._handleMessage(message);
      } catch (error) {
        moduleLogger.error('Message handling error: %o', error);
      }
    });

    socket.on('pong', () => {
      socket.aux.isAwaitingPong = false;
    });

    socket.on('close', () => {
      socket.aux?.destroySocket();
    });
  }

  private async _checkSessionInvalidated() {
    if (this.sessionId != null) {
      const sessionInvalidated = await dataAbstraction().hget(
        'session',
        this.sessionId,
        'invalidated',
      );

      if (sessionInvalidated) {
        this.destroySocket();

        return true;
      }
    }

    return false;
  }

  async setup() {
    if (this._setupPromise != null) {
      return await this._setupPromise;
    }

    this._setupPromise = new Resolvable();

    if (this.sessionId != null) {
      let sessionInvalidated;

      [this.userId, sessionInvalidated] = await Promise.all([
        dataAbstraction().hget('session', this.sessionId, 'user-id'),

        this._checkSessionInvalidated(),
      ]);

      if (this.userId == null || sessionInvalidated) {
        this.destroySocket();
        throw new Error('Invalid session.');
      }

      getSub().on('messageBuffer', this._handleUserNotification);

      await getSub().subscribe(`user-notification:${this.userId}`);
    }

    this._setupPromise.resolve();
  }

  private _handleUserNotification = async (
    channelBuffer: Buffer,
    messageBuffer: Buffer,
  ) => {
    if (bytesToText(channelBuffer) === `user-notification:${this.userId}`) {
      if (await this._checkSessionInvalidated()) {
        return;
      }

      const encoder = encoding.createEncoder();

      encoding.writeVarUint(
        encoder,
        RealtimeServerMessageType.USER_NOTIFICATION,
      );

      encoding.writeVarUint8Array(encoder, messageBuffer);

      this.socket.send(encoding.toUint8Array(encoder));
    }
  };

  private async _handleMessage(message: ArrayBuffer) {
    if (await this._checkSessionInvalidated()) {
      return;
    }

    const decoder = decoding.createDecoder(new Uint8Array(message));

    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case RealtimeClientMessageType.REQUEST:
        await this._handleRequest(decoder);
        break;
      default:
        throw new Error('Unknown message type');
    }
  }
  private async _handleRequest(decoder: decoding.Decoder) {
    // Gather commands

    const firstCommandId = decoding.readVarUint(decoder);

    const commandCount = decoding.readVarUint(decoder);

    let commands: RealtimeCommand[] = [];

    for (let i = 0; i < commandCount; i++) {
      const commandType = decoding.readVarUint(decoder);
      const commandArgs = unpack(decoding.readVarUint8Array(decoder));

      commands.push({
        id: firstCommandId + i,
        type: commandType,
        args: commandArgs,
      });
    }

    // Execute commands and gather results

    const promises: PromiseLike<any>[] = [];

    for (const command of commands) {
      promises.push(this._handleCommand(command));
    }

    const results = await Promise.allSettled(promises);

    if (this._dataNotificationBuffer.length > 0) {
      this._flushDataNotificationBuffer();
    }

    // Encode and send response

    commands = commands.filter(
      (command) => command.type === RealtimeCommandType.HGET,
    );

    if (commands.length === 0) {
      return;
    }

    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, RealtimeServerMessageType.RESPONSE);

    encoding.writeVarUint(encoder, commands.length);

    for (const command of commands) {
      const commandIndex = command.id - firstCommandId;

      encoding.writeVarUint(encoder, command.id);

      encoding.writeVarUint8Array(
        encoder,
        pack((results[commandIndex] as any).value),
      );
    }

    this.socket.send(encoding.toUint8Array(encoder));
  }
  private async _handleCommand({ type, args }: RealtimeCommand) {
    switch (type) {
      case RealtimeCommandType.HGET:
        return await this._handleHGet(args);
      case RealtimeCommandType.HSET:
        return await this._handleHSet(args);
      case RealtimeCommandType.SUBSCRIBE:
        return await this._handleSubscribe(args);
      case RealtimeCommandType.UNSUBSCRIBE:
        return await this._handleUnsubscribe(args);
      default:
        throw new Error('Unknown command type');
    }
  }

  private async _handleHGet(args: [DataPrefix, string, string]) {
    const [prefix, suffix, field] = args;

    // Check if user can access value

    if (
      !(dataHashes[prefix] as DataHash)?.fields[field]?.userGettable?.({
        dataAbstraction: dataAbstraction(),
        userId: this.userId,
        suffix,
      })
    ) {
      return;
    }

    const resolvable = new Resolvable<any>();

    this._hGetBuffer.push([...args, resolvable]);

    if (this._hGetBuffer.length === 1) {
      setTimeout(() => this._flushHGetBuffer());
    }

    return await resolvable;
  }
  private async _flushHGetBuffer() {
    if (this._hGetBuffer.length === 0) {
      return;
    }

    const hGetBuffer = this._hGetBuffer;
    this._hGetBuffer = [];

    // Reduce

    const hashValues: Record<string, Record<string, any>> = {};

    for (const [prefix, suffix, field] of hGetBuffer) {
      const key = `${prefix}:${suffix}`;

      if (hashValues[key] == null) {
        hashValues[key] = {};
      }

      hashValues[key][field] = undefined;
    }

    // Flush

    const objPromises: Record<string, Promise<Record<string, any>>> = {};

    for (const [key, obj] of Object.entries(hashValues)) {
      const [prefix, suffix] = splitStr(key, ':', 2);

      const fields = Object.keys(obj);

      objPromises[key] = objectifyPromiseResults(
        fields,
        dataAbstraction().hmget(prefix as any, suffix, fields),
      );
    }

    // Resolve

    const results = await allAsyncProps(objPromises);

    for (const [prefix, suffix, field, resolvable] of hGetBuffer) {
      resolvable.resolve(results[`${prefix}:${suffix}`][field]);
    }

    moduleLogger.sub('flushHGetBuffer').info('Results: %o', results);
  }

  private async _handleHSet(args: [DataPrefix, string, string, any]) {
    const [prefix, suffix, field] = args;

    if (
      !(await (dataHashes[prefix] as DataHash)?.fields[field]?.userSettable?.({
        dataAbstraction: dataAbstraction(),
        userId: this.userId,
        suffix,
      }))
    ) {
      return;
    }

    const resolvable = new Resolvable();

    this._hSetBuffer.push([...args, resolvable]);

    if (this._hSetBuffer.length === 1) {
      setTimeout(() => this._flushHSetBuffer());
    }

    return await resolvable;
  }
  private async _flushHSetBuffer() {
    if (this._hSetBuffer.length === 0) {
      return;
    }

    const hSetBuffer = this._hSetBuffer;
    this._hSetBuffer = [];

    // Reduce

    const hashValues: Record<string, Record<string, any>> = {};

    for (const [prefix, suffix, field, value] of hSetBuffer) {
      const key = `${prefix}:${suffix}`;

      if (hashValues[key] == null) {
        hashValues[key] = {};
      }

      hashValues[key][field] = value;
    }

    moduleLogger.sub('flushHSetBuffer').info('Hash values: %o', hashValues);

    // Flush

    const promises: PromiseLike<any>[] = [];

    for (const [key, obj] of Object.entries(hashValues)) {
      const [prefix, suffix] = splitStr(key, ':', 2);

      promises.push(
        dataAbstraction().hmset(prefix as any, suffix, obj, {
          origin: this.socket,
        }),
      );
    }

    // Resolve

    await Promise.all(promises);

    for (const [, , , , resolvable] of hSetBuffer) {
      resolvable.resolve();
    }
  }

  private async _handleSubscribe(args: [DataPrefix, string, string]) {
    // Setup update listener

    moduleLogger.sub('handleSubscribe').info('%o', args);

    const [prefix, suffix, field] = args;

    const fullKey = getFullKey(prefix, suffix, field);

    // Check if user can access value

    const fieldInfo = (dataHashes[prefix] as DataHash)?.fields[field];

    // Subscribe to value

    if (fieldInfo?.notifyUpdates && !this._listeners.has(fullKey)) {
      const updateListener: DataUpdateListener = async ({ value, origin }) => {
        if (this.socket === origin) {
          return;
        }

        if (await this._checkSessionInvalidated()) {
          return;
        }

        if (
          !(await fieldInfo?.userGettable?.({
            dataAbstraction: dataAbstraction(),
            userId: this.userId,
            suffix,
          }))
        ) {
          return;
        }

        this._dataNotificationBuffer.push([prefix, suffix, field, value]);

        this._flushDataNotificationBuffer();
      };

      await dataAbstraction().addUpdateListener(
        prefix as any,
        suffix,
        field,
        updateListener,
      );

      this._listeners.set(fullKey, updateListener);
    }

    if (
      await fieldInfo?.userGettable?.({
        dataAbstraction: dataAbstraction(),
        userId: this.userId,
        suffix,
      })
    ) {
      const value = await dataAbstraction().hget(prefix as any, suffix, field);

      this._dataNotificationBuffer.push([prefix, suffix, field, value]);
    } else {
      this._dataNotificationBuffer.push([prefix, suffix, field, undefined]);
    }
  }
  private async _handleUnsubscribe(args: [DataPrefix, string, string]) {
    moduleLogger.sub('handleUnsubscribe').info('%o', args);

    const [prefix, suffix, field] = args;

    const updateListener = this._listeners.get(`${prefix}:${suffix}:${field}`);

    if (updateListener == null) {
      return;
    }

    await dataAbstraction().removeUpdateListener(updateListener);
  }

  _flushDataNotificationBuffer = debounce(() => {
    if (this._dataNotificationBuffer.length === 0) {
      return;
    }

    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, RealtimeServerMessageType.DATA_NOTIFICATION);

    encoding.writeVarUint(encoder, this._dataNotificationBuffer.length);

    for (const [prefix, suffix, field, value] of this._dataNotificationBuffer) {
      encoding.writeVarString(encoder, prefix);
      encoding.writeVarString(encoder, String(suffix));
      encoding.writeVarString(encoder, field);
      encoding.writeVarUint8Array(encoder, pack(value));
    }

    this._dataNotificationBuffer.length = 0;

    this.socket.send(encoding.toUint8Array(encoder));
  });

  destroySocket() {
    // Clear auxiliar object

    this.socket.aux = null as any;

    this.socket.terminate();

    // Unsubscribe from user notifications

    void getSub().unsubscribe(`user-notification:${this.userId}`);

    getSub().off('message', this._handleUserNotification);

    // Remove update listeners

    for (const updateListener of this._listeners.values()) {
      void dataAbstraction().removeUpdateListener(updateListener);
    }
  }
}
