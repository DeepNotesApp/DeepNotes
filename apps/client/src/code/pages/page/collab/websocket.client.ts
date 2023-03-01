import {
  CollabClientDocMessageType,
  CollabMessageType,
  CollabServerDocMessageType,
} from '@deeplib/misc';
import { ClientSocket } from '@stdlib/misc';
import { Resolvable } from '@stdlib/misc';
import { Y } from '@syncedstore/core';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { cloneDeep, once, throttle } from 'lodash';
import { isWithinTimeout } from 'src/code/utils.universal';
import * as awarenessProtocol from 'y-protocols/awareness';

import { groupContentKeyrings } from '../../computed/group-content-keyrings.client';
import { pageKeyrings } from '../../computed/page-keyrings.client';
import type { Page } from '../page.client';
import type { PageCollab } from './collab.client';
import type { IAwarenessChanges } from './presence.client';

export const PageWebsocket = once(
  () =>
    class extends ClientSocket() {
      private readonly _logger;

      readonly page: Page;
      readonly collab: PageCollab;

      readonly doc;
      readonly awareness;

      private readonly _updateBuffer: Uint8Array[] = [];

      private _updateId = 0;
      private _unackedUpdates = new Map<number, Uint8Array>();

      private _localAwarenessEnabled = false;

      syncPromise?: Resolvable;

      constructor({ collab }: { collab: PageCollab }) {
        super(
          `${
            process.env.DEV
              ? process.env.COLLAB_SERVER_URL_DEV
              : process.env.COLLAB_SERVER_URL_PROD
          }/page:${collab.page.id}`,
        );

        this.page = collab.page;
        this.collab = collab;

        this.doc = collab.doc;
        this.awareness = collab.presence.awareness;

        this._logger = mainLogger().sub('Websocket').sub(this.page.id);
      }

      connect() {
        super.connect();

        this.syncPromise ??= new Resolvable();

        this.socket?.addEventListener('open', () => {
          if (this._unackedUpdates.size > 0) {
            this._updateBuffer.push(...this._unackedUpdates.values());

            this._unackedUpdates.clear();
          }

          this._sendDocSingleUpdateMessageImmediate();

          if (this._localAwarenessEnabled) {
            this._sendAwarenessMessageImmediate();
          }
        });

        this.socket?.addEventListener('message', (event) => {
          this._handleMessage(new Uint8Array(event.data));
        });
      }

      enableLocalAwareness() {
        if (!this.connected) {
          return;
        }

        if (this._localAwarenessEnabled) {
          return;
        }

        this._localAwarenessEnabled = true;

        this._logger.info('Enable local awareness');

        // Recover local awareness state

        this.awareness.setLocalState(
          cloneDeep((this as any).awareness.localStateBackup),
        );

        // Send awareness message

        this._sendAwarenessMessageImmediate();

        // Setup update listener

        this.awareness.on('update', this._handleAwarenessUpdate);

        // Setup unload listener

        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', this.disableLocalAwareness);
        } else if (typeof process !== 'undefined') {
          process.on('exit', this.disableLocalAwareness);
        }
      }
      disableLocalAwareness = () => {
        if (!this._localAwarenessEnabled) {
          return;
        }

        this._localAwarenessEnabled = false;

        this._logger.info('Disable local awareness');

        // Clear unload listener

        if (typeof window !== 'undefined') {
          window.removeEventListener(
            'beforeunload',
            this.disableLocalAwareness,
          );
        } else if (typeof process !== 'undefined') {
          process.off('exit', this.disableLocalAwareness);
        }

        // Clear update listener

        this.awareness.off('update', this._handleAwarenessUpdate);

        // Send awareness state removal

        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          [this.doc.clientID],
          null,
        );

        this._sendAwarenessMessageImmediate();
      };

      // Document update handling

      private _handleDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin === this) {
          return;
        }

        this._updateBuffer.push(update);

        this._sendDocSingleUpdateMessageThrottled();
      };

      private _sendDocAllUpdatesUnmergedResponseMessage({
        requestIdBytes,

        rotatePageKey,
        encryptedPageRelativeTitle,
        encryptedPageAbsoluteTitle,
        encryptedSnapshotSymmetricKeys,

        createSnapshot,
        updateIndex,
      }: {
        requestIdBytes: Uint8Array;

        rotatePageKey: boolean;
        encryptedPageRelativeTitle: Uint8Array;
        encryptedPageAbsoluteTitle: Uint8Array;
        encryptedSnapshotSymmetricKeys: Map<string, Uint8Array>;

        createSnapshot: boolean;
        updateIndex: number;
      }) {
        let pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        const encoder = encoding.createEncoder();

        // Write headers

        encoding.writeVarUint(encoder, CollabMessageType.DOC);
        encoding.writeVarUint(
          encoder,
          CollabClientDocMessageType.ALL_UPDATES_UNMERGED_RESPONSE,
        );

        // Write request ID

        encoding.writeVarUint8Array(encoder, requestIdBytes);

        // Rotate page key

        encoding.writeUint8(encoder, rotatePageKey ? 1 : 0);

        if (rotatePageKey) {
          this._logger.info('Rotating page key');

          pageKeyring = pageKeyring.addKey();

          const groupContentKeyring = groupContentKeyrings()(
            this.page.react.groupId,
          ).get()!;

          encoding.writeVarUint8Array(
            encoder,
            pageKeyring.wrapSymmetric(groupContentKeyring).fullValue,
          );

          encoding.writeVarUint8Array(
            encoder,
            pageKeyring.encrypt(
              pageKeyring.decrypt(encryptedPageRelativeTitle),
            ),
          );

          encoding.writeVarUint8Array(
            encoder,
            pageKeyring.encrypt(
              pageKeyring.decrypt(encryptedPageAbsoluteTitle),
            ),
          );

          encoding.writeVarUint(encoder, encryptedSnapshotSymmetricKeys.size);

          for (const [
            clientId,
            encryptedSymmetricKey,
          ] of encryptedSnapshotSymmetricKeys) {
            encoding.writeVarString(encoder, clientId);

            encoding.writeVarUint8Array(
              encoder,
              pageKeyring.encrypt(pageKeyring.decrypt(encryptedSymmetricKey)),
            );
          }
        }

        // Write full update

        encoding.writeVarUint(encoder, updateIndex);

        encoding.writeVarUint8Array(
          encoder,
          pageKeyring.encrypt(pageKeyring.value),
        ); // Encrypted symmetric key

        const rawUpdate = Y.encodeStateAsUpdateV2(this.doc);
        const encryptedUpdate = pageKeyring.encrypt(rawUpdate);
        encoding.writeVarUint8Array(encoder, encryptedUpdate);

        encoding.writeUint8(encoder, createSnapshot ? 1 : 0);

        // Send message

        this.send(encoding.toUint8Array(encoder), () => {
          this._logger.info('Doc all updates merged message sent');
        });
      }

      private _sendDocSingleUpdateMessageImmediate() {
        if (this._updateBuffer.length === 0) {
          return;
        }

        const mergedUpdate = Y.mergeUpdatesV2(this._updateBuffer);
        this._updateBuffer.length = 0;

        const encoder = encoding.createEncoder();

        encoding.writeVarUint(encoder, CollabMessageType.DOC);
        encoding.writeVarUint(
          encoder,
          CollabClientDocMessageType.SINGLE_UPDATE,
        );

        this._unackedUpdates.set(this._updateId, mergedUpdate);

        const pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        const encryptedUpdate = pageKeyring.encrypt(mergedUpdate);

        encoding.writeVarUint(encoder, this._updateId);
        encoding.writeVarUint8Array(encoder, encryptedUpdate);

        this.send(encoding.toUint8Array(encoder), () => {
          this._logger.info(
            `Doc single update message sent (id: ${this._updateId}, size: ${encryptedUpdate.length})`,
          );
        });

        ++this._updateId;
      }
      private _sendDocSingleUpdateMessageThrottled = throttle(
        () => this._sendDocSingleUpdateMessageImmediate(),
        200,
        { leading: false },
      );

      // Awareness update handling

      private _handleAwarenessUpdate = ({
        added,
        updated,
        removed,
      }: IAwarenessChanges) => {
        if (
          !added.includes(this.doc.clientID) &&
          !updated.includes(this.doc.clientID) &&
          !removed.includes(this.doc.clientID)
        ) {
          return;
        }

        if (!isWithinTimeout()) {
          this._sendAwarenessMessageThrottled();
        }
      };

      private _sendAwarenessMessageImmediate = () => {
        const pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        const awarenessUpdate = pageKeyring.encrypt(
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
            this.doc.clientID,
          ]),
        );

        const encoder = encoding.createEncoder();

        encoding.writeVarUint(encoder, CollabMessageType.AWARENESS);
        encoding.writeVarUint(encoder, 1);
        encoding.writeVarUint8Array(encoder, awarenessUpdate);

        this.send(encoding.toUint8Array(encoder), () => {
          this._logger.info(
            `Awareness message sent (size: ${awarenessUpdate.length})`,
          );
        });
      };
      private _sendAwarenessMessageThrottled = throttle(
        this._sendAwarenessMessageImmediate,
        200,
        { leading: false },
      );

      // Message handling

      private _handleMessage(message: Uint8Array) {
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case CollabMessageType.AWARENESS:
            this._handleAwarenessMessage(decoder);
            break;
          case CollabMessageType.DOC:
            this._handleDocMessage(decoder);
            break;
          default:
            this._logger.error('Unable to compute message');
        }
      }
      private _handleAwarenessMessage(decoder: decoding.Decoder) {
        this._logger.info('Awareness message received');

        const pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        const numUpdates = decoding.readVarUint(decoder);

        for (let i = 0; i < numUpdates; i++) {
          try {
            awarenessProtocol.applyAwarenessUpdate(
              this.awareness,
              pageKeyring.decrypt(decoding.readVarUint8Array(decoder)),
              this,
            );
          } catch (error) {
            // this._logger.error(error);
          }
        }
      }
      private _handleDocMessage(decoder: decoding.Decoder) {
        const syncMessageType = decoding.readVarUint(decoder);

        switch (syncMessageType) {
          case CollabServerDocMessageType.ALL_UPDATES_UNMERGED:
            this._handleDocAllUpdatesUnmergedMessage(decoder);
            break;
          case CollabServerDocMessageType.SINGLE_UPDATE:
            this._handleDocSingleUpdateMessage(decoder);
            break;
          case CollabServerDocMessageType.SINGLE_UPDATE_ACK:
            this._handleDocSingleUpdateAckMessage(decoder);
            break;
        }
      }

      // Update message handling

      private _handleDocAllUpdatesUnmergedMessage(decoder: decoding.Decoder) {
        this._logger.info('Doc all updates unmerged message received');

        const pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        // Read updates

        const updateIndex = decoding.readVarUint(decoder);

        const numUpdates = decoding.readVarUint(decoder);

        this.doc.transact(() => {
          for (let i = 0; i < numUpdates; i++) {
            try {
              const encryptedUpdate = decoding.readVarUint8Array(decoder);
              const rawUpdate = pageKeyring.decrypt(encryptedUpdate);
              Y.applyUpdateV2(this.doc, rawUpdate, this);
            } catch (error) {
              // this._logger.error(error);
            }
          }
        });

        this.syncPromise?.resolve();
        this.syncPromise = undefined;

        this.doc.on('updateV2', this._handleDocUpdate);

        // Check if requested merged updates

        const rotatePageKey = decoding.readUint8(decoder) === 1;

        let encryptedPageRelativeTitle: Uint8Array | undefined;
        let encryptedPageAbsoluteTitle: Uint8Array | undefined;

        const encryptedSnapshotSymmetricKeys = new Map<string, Uint8Array>();

        if (rotatePageKey) {
          encryptedPageRelativeTitle = decoding.readVarUint8Array(decoder);
          encryptedPageAbsoluteTitle = decoding.readVarUint8Array(decoder);

          const numSnapshotSymmetricKeys = decoding.readVarUint(decoder);

          for (let i = 0; i < numSnapshotSymmetricKeys; i++) {
            const snapshotId = decoding.readVarString(decoder);
            const encryptedSymmetricKey = decoding.readVarUint8Array(decoder);

            encryptedSnapshotSymmetricKeys.set(
              snapshotId,
              encryptedSymmetricKey,
            );
          }
        }

        const createSnapshot = decoding.readUint8(decoder) === 1;

        if (rotatePageKey || createSnapshot) {
          const requestIdBytes = decoding.readVarUint8Array(decoder);

          this._sendDocAllUpdatesUnmergedResponseMessage({
            requestIdBytes,

            rotatePageKey,
            encryptedPageRelativeTitle: encryptedPageRelativeTitle!,
            encryptedPageAbsoluteTitle: encryptedPageAbsoluteTitle!,
            encryptedSnapshotSymmetricKeys,

            createSnapshot,
            updateIndex,
          });
        }
      }

      private _handleDocSingleUpdateMessage(decoder: decoding.Decoder) {
        const pageKeyring = pageKeyrings()(
          `${this.page.react.groupId}:${this.page.id}`,
        ).get()!;

        if (pageKeyring == null) {
          return;
        }

        try {
          const encryptedUpdate = decoding.readVarUint8Array(decoder);

          this._logger.info(
            `Doc single update message received (size: ${encryptedUpdate.length})`,
          );

          const rawUpdate = pageKeyring.decrypt(encryptedUpdate);
          Y.applyUpdateV2(this.doc, rawUpdate, this);
        } catch (error) {
          // this._logger.error(error);
        }
      }

      private _handleDocSingleUpdateAckMessage(decoder: decoding.Decoder) {
        const updateId = decoding.readVarUint(decoder);

        this._unackedUpdates.delete(updateId);

        this._logger.info(
          `Doc single update ack message received (id: ${updateId})`,
        );
      }

      override disconnect() {
        this._logger.info('Disconnecting');

        this.syncPromise = undefined;

        this.disableLocalAwareness();

        super.disconnect();
      }

      destroy() {
        this.doc.off('updateV2', this._handleDocUpdate);

        this.disconnect();
      }
    },
);
export type PageWebsocket = InstanceType<ReturnType<typeof PageWebsocket>>;
