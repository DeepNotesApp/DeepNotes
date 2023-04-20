import { getAllPageUpdates, insertPageSnapshot } from '@deeplib/data';
import { PageSnapshotModel, PageUpdateModel } from '@deeplib/db';
import {
  CollabClientDocMessageType,
  CollabMessageType,
  CollabServerDocMessageType,
  rolesMap,
} from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { getSelfPublisherIdBytes } from '@stdlib/data';
import { patchMultiple } from '@stdlib/db';
import { addDays, addMinutes, splitStr } from '@stdlib/misc';
import { mainLogger } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { randomBytes } from 'crypto';
import type { IncomingMessage } from 'http';
import { decoding, encoding } from 'lib0';
import type { WebSocket } from 'ws';

import { dataAbstraction } from './data/data-abstraction';
import { getRedis } from './data/redis';
import { bufferizePageUpdate } from './data/redis/bufferize-page-update';
import { flushPageUpdateBuffer } from './data/redis/flush-page-update-buffer';
import { squashPageUpdates } from './data/redis/squash-page-updates';
import { usingLocks } from './data/redlock';
import type { Room } from './rooms';
import { getRoom } from './rooms';

const moduleLogger = mainLogger.sub('sockets.ts');

const _pendingRequests = new Map<string, NodeJS.Timeout>();

export class SocketAuxObject {
  readonly socket: WebSocket;

  readonly sessionId?: string;

  private _setupPromise?: Promise<any>; // Necessary to delay message handling

  isAwaitingPong = false;

  room!: Room;

  userId?: string;

  readonly clientIds: Set<number> = new Set();

  constructor(socket: WebSocket, req: IncomingMessage) {
    this.socket = socket;

    this.sessionId = req.sessionId;

    // Listen to events

    this.socket.on('message', async (message: ArrayBuffer) => {
      try {
        await this._setupPromise;

        await this._handleMessage(message);
      } catch (error) {
        moduleLogger.error('Message handling error: %o', error);
      }
    });

    this.socket.on('pong', () => {
      moduleLogger.info(`[${this.room?.name}] Pong received`);

      this.isAwaitingPong = false;
    });

    this.socket.on('close', async () => {
      if (this.socket?.aux == null) {
        return;
      }

      moduleLogger.info(`[${this.room?.name}] Socket closed`);

      this.destroySocket();
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

  async setup(req: IncomingMessage) {
    if (this._setupPromise != null) {
      return await this._setupPromise;
    }

    this._setupPromise = (async () => {
      // Check user permissions

      const roomName = (req.url ?? '').slice(1);
      const pageId = splitStr(roomName, ':', 2)[1];

      const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

      const groupIsPublic = await dataAbstraction().hget(
        'group',
        groupId!,
        'is-public',
      );

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

        if (!groupIsPublic) {
          const [[userPlan, personalGroupId], groupMemberRole] =
            await Promise.all([
              dataAbstraction().hmget('user', this.userId, [
                'plan',
                'personal-group-id',
              ]),

              dataAbstraction().hget(
                'group-member',
                `${groupId}:${this.userId}`,
                'role',
              ),
            ]);

          if (userPlan !== 'pro' && groupId !== personalGroupId) {
            throw new Error('This requires a Pro plan subscription.');
          }

          if (groupMemberRole == null) {
            throw new Error('User is not a member of the group.');
          }
        }
      } else {
        if (!groupIsPublic) {
          this.destroySocket();

          throw new Error(
            'Unauthenticated users can only access public groups.',
          );
        }
      }

      // Setup room

      this.room = getRoom(roomName);
      this.room.addSocket(this.socket);

      await this.room.setup();

      await this._sendDocAllUpdatesUnmergedMessage();
      await this._sendAwarenessSyncMessage();
    })();

    return await this._setupPromise;
  }

  private async _sendDocAllUpdatesUnmergedMessage() {
    const [
      pageUpdates,

      userPlan,

      [nextSnapshotDate, nextSnapshotUpdateIndex, nextKeyRotationDate],
    ] = await Promise.all([
      getAllPageUpdates(this.room.pageId, getRedis()),

      dataAbstraction().hget('user', this.userId!, 'plan'),

      dataAbstraction().hmget('page', this.room.pageId, [
        'next-snapshot-date',
        'next-snapshot-update-index',

        'next-key-rotation-date',
      ]),
    ]);

    const encoder = encoding.createEncoder();

    // Write headers

    encoding.writeVarUint(encoder, CollabMessageType.DOC);
    encoding.writeVarUint(
      encoder,
      CollabServerDocMessageType.ALL_UPDATES_UNMERGED,
    );

    // Write page updates

    const pageUpdateIndex = pageUpdates.at(-1)?.[0] ?? 0;

    const createSnapshot =
      userPlan === 'pro' &&
      new Date() >= nextSnapshotDate &&
      pageUpdateIndex >= nextSnapshotUpdateIndex;

    if (createSnapshot) {
      void dataAbstraction().patch('page', this.room.pageId, {
        next_snapshot_date: addMinutes(new Date(), 15),
        next_snapshot_update_index: pageUpdateIndex + 200,
      });
    }

    encoding.writeVarUint(encoder, pageUpdateIndex);

    encoding.writeVarUint(encoder, pageUpdates.length);

    for (const pageUpdate of pageUpdates) {
      encoding.writeVarUint8Array(encoder, pageUpdate[1]);
    }

    // Write values for key rotation

    const rotatePageKey = new Date() >= nextKeyRotationDate;

    if (!rotatePageKey) {
      encoding.writeUint8(encoder, 0);
    } else {
      try {
        await usingLocks(
          [[`page-lock:${this.room.pageId}`]],
          async (signals) => {
            const groupId = await dataAbstraction().hget(
              'page',
              this.room.pageId,
              'group-id',
            );

            checkRedlockSignalAborted(signals);

            await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
              // Recheck page key rotation, but within locks

              const nextKeyRotationDate = await dataAbstraction().hget(
                'page',
                this.room.pageId,
                'next-key-rotation-date',
              );

              const rotatePageKey = new Date() >= nextKeyRotationDate;

              encoding.writeUint8(encoder, rotatePageKey ? 1 : 0);

              if (!rotatePageKey) {
                return;
              }

              await dataAbstraction().patch('page', this.room.pageId, {
                next_key_rotation_date: addDays(new Date(), 7),
              });

              checkRedlockSignalAborted(signals);

              const [
                pageEncryptedRelativeTitle,
                pageEncryptedAbsoluteTitle,
                pageSnapshots,
              ] = await Promise.all([
                dataAbstraction().hget(
                  'page',
                  this.room.pageId,
                  'encrypted-relative-title',
                ),

                dataAbstraction().hget(
                  'page',
                  this.room.pageId,
                  'encrypted-absolute-title',
                ),

                PageSnapshotModel.query()
                  .where('page_id', this.room.pageId)
                  .select('id', 'encrypted_symmetric_key'),
              ]);

              checkRedlockSignalAborted(signals);

              encoding.writeVarUint8Array(encoder, pageEncryptedRelativeTitle);
              encoding.writeVarUint8Array(encoder, pageEncryptedAbsoluteTitle);

              encoding.writeVarUint(encoder, pageSnapshots.length);

              for (const pageSnapshot of pageSnapshots) {
                encoding.writeVarString(encoder, pageSnapshot.id);
                encoding.writeVarUint8Array(
                  encoder,
                  pageSnapshot.encrypted_symmetric_key,
                );
              }
            });
          },
        );
      } catch (error) {
        encoding.writeUint8(encoder, 0);
      }
    }

    encoding.writeUint8(encoder, createSnapshot ? 1 : 0);

    // Write request ID

    if (rotatePageKey || createSnapshot) {
      const requestIdBytes = randomBytes(16);

      encoding.writeVarUint8Array(encoder, requestIdBytes);

      const requestIdBase64 = bytesToBase64(requestIdBytes);

      _pendingRequests.set(
        requestIdBase64,
        setTimeout(() => _pendingRequests.delete(requestIdBase64), 30 * 1000),
      );
    }

    // Send message

    this.socket.send(encoding.toUint8Array(encoder));

    moduleLogger.info(
      `[${this.room.name}] Doc all updates unmerged message sent (${pageUpdateIndex})`,
    );
  }

  private _createDocSingleUpdateMessage(encryptedData: Uint8Array) {
    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, CollabMessageType.DOC);
    encoding.writeVarUint(encoder, CollabServerDocMessageType.SINGLE_UPDATE);

    encoding.writeVarUint8Array(encoder, encryptedData);

    return encoding.toUint8Array(encoder);
  }

  private _sendDocSingleUpdateAckMessage(updateId: number) {
    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, CollabMessageType.DOC);
    encoding.writeVarUint(
      encoder,
      CollabServerDocMessageType.SINGLE_UPDATE_ACK,
    );

    encoding.writeVarUint(encoder, updateId);

    this.socket.send(encoding.toUint8Array(encoder));
  }

  private async _sendAwarenessSyncMessage() {
    const encoder = encoding.createEncoder();

    encoding.writeVarUint(encoder, CollabMessageType.AWARENESS);

    const awarenessUpdates = await getRedis().zrangebyscoreBuffer(
      `page-awareness-buffer:{${this.room.pageId}}`,
      Date.now(),
      '+inf',
    );

    encoding.writeVarUint(encoder, awarenessUpdates.length);

    for (const awarenessUpdate of awarenessUpdates) {
      encoding.writeVarUint8Array(encoder, awarenessUpdate);
    }

    this.socket.send(encoding.toUint8Array(encoder));

    moduleLogger.info(
      `[${this.room.name}] Awareness synchronization message sent`,
    );
  }

  private async _handleMessage(messageBuffer: ArrayBuffer) {
    const [groupId, sessionInvalidated] = await Promise.all([
      dataAbstraction().hget('page', this.room.pageId, 'group-id'),

      ...(this.sessionId != null
        ? [dataAbstraction().hget('session', this.sessionId, 'invalidated')]
        : []),
    ]);

    // Check if session is invalidated

    if (sessionInvalidated) {
      this.destroySocket();

      return;
    }

    // Check if has permission to edit

    const role =
      groupId != null && this.userId != null
        ? await dataAbstraction().hget(
            'group-member',
            `${groupId}:${this.userId}`,
            'role',
          )
        : null;

    if (!rolesMap()[role]?.permissions.editGroupPages) {
      moduleLogger.info('Ignored message from unauthorized user');
      return;
    }

    const message = new Uint8Array(messageBuffer);

    const decoder = decoding.createDecoder(message);

    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case CollabMessageType.AWARENESS:
        await this._handleAwarenessMessage(decoder, message);
        break;
      case CollabMessageType.DOC:
        await this._handleDocMessage(decoder);
        break;
      default:
        throw new Error('Unknown message type');
    }
  }

  private async _handleAwarenessMessage(
    decoder: decoding.Decoder,
    message: Uint8Array,
  ) {
    const promises: PromiseLike<any>[] = [];

    const numUpdates = decoding.readVarUint(decoder);

    const expirationDate = Date.now() + 30 * 1000;

    for (let i = 0; i < numUpdates; i++) {
      promises.push(
        getRedis().zadd(
          `page-awareness-buffer:{${this.room.pageId}}`,
          expirationDate,
          Buffer.from(decoding.readVarUint8Array(decoder)),
        ),
      );
    }

    // Remove expired awareness updates

    promises.push(
      getRedis().zremrangebyscore(
        `page-awareness-buffer:{${this.room.pageId}}`,
        0,
        Date.now(),
      ),
    );

    // Reset expiration for awareness buffer

    promises.push(
      getRedis().expire(`page-awareness-buffer:{${this.room.pageId}}`, 30),
    );

    // Publish awareness message

    promises.push(this._publish(message));

    await Promise.all(promises);

    moduleLogger.info(`[${this.room.name}] Awareness message received`);
  }

  private async _handleDocMessage(decoder: decoding.Decoder) {
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case CollabClientDocMessageType.ALL_UPDATES_UNMERGED_RESPONSE:
        await this._handleDocAllUpdatesUnmergedResponseMessage(decoder);
        break;
      case CollabClientDocMessageType.SINGLE_UPDATE:
        await this._handleDocSingleUpdateMessage(decoder);
        break;
      default:
        throw new Error('Unknown sync message type');
    }
  }

  private async _handleDocAllUpdatesUnmergedResponseMessage(
    decoder: decoding.Decoder,
  ) {
    // Check if there's a pending request

    const requestIdBytes = decoding.readVarUint8Array(decoder);
    const requestIdBase64 = bytesToBase64(requestIdBytes);

    const timeout = _pendingRequests.get(requestIdBase64);

    if (timeout == null) {
      return;
    }

    clearTimeout(timeout);
    _pendingRequests.delete(requestIdBase64);

    await usingLocks([[`page-lock:${this.room.pageId}`]], async (signals) => {
      const groupId = await dataAbstraction().hget(
        'page',
        this.room.pageId,
        'group-id',
      );

      checkRedlockSignalAborted(signals);

      await usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          await dataAbstraction().transaction(async (dtrx) => {
            // Rotate page key

            const rotatePageKey = decoding.readUint8(decoder) === 1;

            if (rotatePageKey) {
              const encryptedPageKeyring = decoding.readVarUint8Array(decoder);

              const encryptedPageRelativeTitle =
                decoding.readVarUint8Array(decoder);
              const encryptedPageAbsoluteTitle =
                decoding.readVarUint8Array(decoder);

              const encryptedSnapshotSymmetricKeys = new Map<
                string,
                Uint8Array
              >();

              for (let i = 0; i < decoding.readVarUint(decoder); ++i) {
                const snapshotId = decoding.readVarString(decoder);
                const encryptedSymmetricKey =
                  decoding.readVarUint8Array(decoder);

                encryptedSnapshotSymmetricKeys.set(
                  snapshotId,
                  encryptedSymmetricKey,
                );
              }

              await dataAbstraction().patch(
                'page',
                this.room.pageId,
                {
                  encrypted_symmetric_keyring: encryptedPageKeyring,

                  encrypted_relative_title: encryptedPageRelativeTitle,
                  encrypted_absolute_title: encryptedPageAbsoluteTitle,
                },
                { dtrx },
              );

              checkRedlockSignalAborted(signals);

              await patchMultiple(
                'page_snapshots',

                ['id', 'encrypted_symmetric_key'],
                ['char(21)', 'bytea'],
                Array.from(encryptedSnapshotSymmetricKeys.entries()),

                'id = values.id',
                'encrypted_symmetric_key = values.encrypted_symmetric_key',

                { trx: dtrx.trx },
              );

              checkRedlockSignalAborted(signals);
            }

            // Read encrypted update

            const updateIndex = decoding.readVarUint(decoder);
            const encryptedUpdate = decoding.readVarUint8Array(decoder);

            // Create snapshot

            const createSnapshot = decoding.readUint8(decoder) === 1;

            if (createSnapshot) {
              const snapshotEncryptedSymmetricKey =
                decoding.readVarUint8Array(decoder);
              const snapshotEncryptedData = decoding.readVarUint8Array(decoder);

              await insertPageSnapshot({
                dataAbstraction: dataAbstraction(),
                pageId: this.room.pageId,
                authorId: this.userId!,
                encryptedSymmetricKey: snapshotEncryptedSymmetricKey,
                encryptedData: snapshotEncryptedData,
                type: 'periodic',
                dtrx,
              });

              checkRedlockSignalAborted(signals);
            }

            // Delete old unmerged updates

            await PageUpdateModel.query(dtrx.trx)
              .delete()
              .where('page_id', this.room.pageId)
              .andWhere('index', '<=', updateIndex);

            checkRedlockSignalAborted(signals);

            // Insert encrypted update in the database

            await PageUpdateModel.query(dtrx.trx)
              .insert({
                page_id: this.room.pageId,
                index: updateIndex,
                encrypted_data: encryptedUpdate,
              })
              .onConflict(['page_id', 'index'])
              .ignore();

            checkRedlockSignalAborted(signals);

            // Update Redis data

            await Promise.all([
              flushPageUpdateBuffer(this.room.pageId, updateIndex),

              squashPageUpdates(this.room.pageId, updateIndex, encryptedUpdate),
            ]);

            moduleLogger.info(
              `[${this.room.name}] Doc all updates merged message handled`,
            );
          });
        },
        signals,
      );
    });
  }

  private async _handleDocSingleUpdateMessage(decoder: decoding.Decoder) {
    // Read values

    const updateId = decoding.readVarUint(decoder);
    const encryptedData = decoding.readVarUint8Array(decoder);

    // Increment last update index

    let updateIndex = await bufferizePageUpdate(
      this.room.pageId,
      null,
      encryptedData,
    );

    if (updateIndex == null) {
      const lastUpdateIndex = parseInt(
        (
          (await PageUpdateModel.query()
            .where('page_id', this.room.pageId)
            .max('index')
            .first()) as any
        )?.max ?? 0,
      );

      updateIndex = await bufferizePageUpdate(
        this.room.pageId,
        lastUpdateIndex,
        encryptedData,
      );
    }

    // Publish update

    await this._publish(this._createDocSingleUpdateMessage(encryptedData));

    // Respond with ACK message

    this._sendDocSingleUpdateAckMessage(updateId);

    moduleLogger.info(
      `[${this.room.name}] Doc single update message handled (index: ${updateIndex}, size: ${encryptedData.length})`,
    );

    // Send merge updates message periodically

    if (updateIndex % 100 === 0) {
      await this._sendDocAllUpdatesUnmergedMessage();
    }
  }

  private async _publish(message: Uint8Array) {
    this.room.broadcastExcept(message, this.socket);

    await getRedis().publish(
      this.room.name,
      Buffer.concat([getSelfPublisherIdBytes(), message]),
    );
  }

  destroySocket() {
    // Terminate socket

    this.socket.aux = null as any;

    this.socket.terminate();

    // Delete socket from room

    this.room?.removeSocket(this.socket);
  }
}
