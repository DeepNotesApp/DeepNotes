import type { dataHashes, DataPrefix } from '@deeplib/data';
import type { DeepNotesNotification } from '@deeplib/misc';
import {
  RealtimeClientMessageType,
  RealtimeCommandType,
  RealtimeServerMessageType,
} from '@deeplib/misc';
import { base64ToBytes } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { getFullKey } from '@stdlib/misc';
import { ClientSocket, Resolvable, splitStr } from '@stdlib/misc';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { once, throttle } from 'lodash';
import { pack, unpack } from 'msgpackr';

import { getNotificationInfo } from '../pages/notifications/notifications.client';
import { RealtimeContext } from './context.universal';

export interface RealtimeCommand {
  type: RealtimeCommandType;
  args: any;
}

export const RealtimeClient = once(
  () =>
    class extends ClientSocket() {
      private _nextCommandId = 0;

      private readonly _logger = mainLogger().sub('RealtimeClient');

      private readonly _hsetBuffer = new Map<string, any>();

      readonly commandBuffer: RealtimeCommand[] = [];
      private readonly _responsePromises = new Map<number, Resolvable<any>>();

      readonly subscriptions: Record<string, Set<RealtimeContext>> = {};
      readonly pending = reactive(new Map<string, Resolvable<any>>());
      readonly changed = new Set<string>();

      get loading() {
        return this.pending.size > 0;
      }

      readonly values: Record<string, any> = reactive({});

      readonly globalCtx = new (RealtimeContext())();

      private _isFirstConnection = true;

      constructor() {
        super(process.env.REALTIME_SERVER_URL);
      }

      connect() {
        super.connect();

        this.socket?.addEventListener('open', () => {
          if (this._isFirstConnection) {
            this._logger.info('First connection');
            this._isFirstConnection = false;
            return;
          }

          this._logger.info('Reconnecting');

          for (const fullKey of Object.keys(this.subscriptions)) {
            const [key, field] = splitStr(fullKey, '>', 2);
            const [prefix, suffix] = splitStr(key, ':', 2);

            this.commandBuffer.push({
              type: RealtimeCommandType.SUBSCRIBE,
              args: [prefix, suffix, field],
            });
          }

          if (this.commandBuffer.length > 0) {
            setTimeout(this.flushCommandBuffer);
          }
        });

        this.socket?.addEventListener('message', (event) => {
          this._handleMessage(new Uint8Array(event.data));
        });
      }

      // Get commands

      async mhgetCoalesce(
        items: [DataPrefix, string, string][],
        params?: { subscribe?: boolean; ctx?: RealtimeContext },
      ) {
        if (params?.subscribe) {
          return await (params.ctx ?? this.globalCtx).mhgetCoalesceAsync(items);
        } else {
          internals.realtime.markAsDependencies(
            items.map((item) => getFullKey(...item)),
          );

          for (const item of items) {
            const value = await this.hget(
              item[0] as any,
              item[1],
              item[2],
              params,
            );

            if (value != null) {
              return value;
            }
          }
        }
      }
      async mhget(
        items: [DataPrefix, string, string][],
        params?: { subscribe?: boolean; ctx?: RealtimeContext },
      ) {
        return await Promise.all(
          items.map(([prefix, suffix, field]) =>
            this.hget(prefix as any, suffix, field, params),
          ),
        );
      }
      async hmget<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(
        prefix: DataPrefix_,
        suffix: string,
        fields: DataField[],
        params?: { subscribe?: boolean; ctx?: RealtimeContext },
      ) {
        return await Promise.all(
          fields.map((field) => this.hget(prefix, suffix, field, params)),
        );
      }
      async hget<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(
        prefix: DataPrefix_,
        suffix: string,
        field: DataField,
        params?: { subscribe?: boolean; ctx?: RealtimeContext },
      ) {
        if (params?.subscribe) {
          return await (params.ctx ?? this.globalCtx).hgetAsync(
            prefix,
            suffix,
            field,
          );
        }

        // Try to get subscribed value

        if (this.isSynced(prefix, suffix, field)) {
          return this.values[getFullKey(prefix, suffix, field)];
        }

        // Add request to buffer

        this.pushCommand({
          type: RealtimeCommandType.HGET,
          args: [prefix, suffix, field],
        });

        // Wait for response

        const resolvable = new Resolvable<any>();
        this._responsePromises.set(
          this._nextCommandId + this.commandBuffer.length - 1,
          resolvable,
        );
        const response = await resolvable;

        this._logger
          .sub('hget response')
          .info(`${getFullKey(prefix, suffix, field)} (${response})`);

        return response;
      }

      // Set commands

      hset<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, field: DataField, value: any) {
        const fullKey = getFullKey(prefix, suffix, field);

        this._logger.sub('hset').info(`${fullKey}: ${value}`);

        // Set subscribed value

        if (fullKey in this.subscriptions) {
          this.values[fullKey] = value;
        }

        // Add to buffer

        if (this._hsetBuffer.size === 0) {
          setTimeout(this._flushHSetBuffer);
        }

        this._hsetBuffer.set(fullKey, value);
      }
      hmset<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, values: Record<DataField, any>) {
        for (const [field, value] of Object.entries<any>(values)) {
          this.hset(prefix, suffix, field as DataField, value);
        }
      }

      private _flushHSetBuffer = throttle(
        () => {
          this._logger.sub('_flushHSetBuffer').info(this._hsetBuffer.entries());

          for (const [fullKey, value] of this._hsetBuffer) {
            const [key, field] = splitStr(fullKey, '>', 2);
            const [prefix, suffix] = splitStr(key, ':', 2);

            this.pushCommand({
              type: RealtimeCommandType.HSET,
              args: [prefix, suffix, field, value],
            });
          }

          this._hsetBuffer.clear();
        },
        500,
        { leading: false },
      );

      // Command buffer

      pushCommand(command: RealtimeCommand) {
        this.commandBuffer.push(command);

        if (this.commandBuffer.length === 1) {
          setTimeout(this.flushCommandBuffer);
        }
      }

      _resubscribe<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, field: DataField) {
        if (`${prefix}:${suffix}>${field}` in this.subscriptions) {
          this.pushCommand({
            type: RealtimeCommandType.SUBSCRIBE,
            args: [prefix, suffix, field],
          });
        }
      }

      flushCommandBuffer = () => {
        if (this.commandBuffer.length === 0) {
          return;
        }

        this._logger
          .sub('flushCommandBuffer')
          .info('Flushing commands... %o', JSON.stringify(this.commandBuffer));

        const encoder = new encoding.Encoder();

        encoding.writeVarUint(encoder, RealtimeClientMessageType.REQUEST);

        encoding.writeVarUint(encoder, this._nextCommandId);

        encoding.writeVarUint(encoder, this.commandBuffer.length);

        for (const command of this.commandBuffer) {
          encoding.writeVarUint(encoder, command.type);
          encoding.writeVarUint8Array(encoder, pack(command.args));
        }

        this._nextCommandId += this.commandBuffer.length;
        this.commandBuffer.length = 0;

        this.send(encoding.toUint8Array(encoder));
      };

      // Handle messages

      private _handleMessage(message: Uint8Array) {
        this._logger.sub('_handleMessage').info('Received message');

        const decoder = new decoding.Decoder(message);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case RealtimeServerMessageType.RESPONSE:
            this._handleResponse(decoder);
            break;
          case RealtimeServerMessageType.DATA_NOTIFICATION:
            this._handleDataNotification(decoder);
            break;
          case RealtimeServerMessageType.USER_NOTIFICATION:
            void this._handleUserNotification(decoder);
            break;
          default:
            throw new Error(`Unknown message type ${messageType}`);
        }
      }
      private _handleResponse(decoder: decoding.Decoder) {
        const numCommands = decoding.readVarUint(decoder);

        for (let i = 0; i < numCommands; i++) {
          const commandId = decoding.readVarUint(decoder);

          const response = unpack(decoding.readVarUint8Array(decoder));

          const resolvable = this._responsePromises.get(commandId);
          resolvable?.resolve(response);
          this._responsePromises.delete(commandId);
        }
      }
      private _handleDataNotification(decoder: decoding.Decoder) {
        const numItems = decoding.readVarUint(decoder);

        for (let i = 0; i < numItems; i++) {
          const prefix = decoding.readVarString(decoder);
          const suffix = decoding.readVarString(decoder);
          const field = decoding.readVarString(decoder);
          const value = unpack(decoding.readVarUint8Array(decoder));

          const fullKey = getFullKey(prefix, suffix, field);

          if (
            prefix === 'group-member' &&
            field === 'role' &&
            this.isSynced(prefix, suffix, field) &&
            value !== this.values[fullKey]
          ) {
            const groupId = splitStr(suffix, ':', 2)[0];

            this._resubscribe('group', groupId, 'encrypted-content-keyring');
            this._resubscribe('group', groupId, 'encrypted-name');
            this._resubscribe('group', groupId, 'encrypted-private-keyring');
            this._resubscribe('group', groupId, 'permanent-deletion-date');

            this._resubscribe(
              'group-join-invitation',
              suffix,
              'encrypted-name',
            );
            this._resubscribe('group-join-invitation', suffix, 'exists');
            this._resubscribe('group-join-invitation', suffix, 'role');

            this._resubscribe('group-join-request', suffix, 'encrypted-name');
            this._resubscribe('group-join-request', suffix, 'rejected');

            this._resubscribe('group-member', suffix, 'encrypted-name');
            this._resubscribe('group-member', suffix, 'exists');
            this._resubscribe('group-member', suffix, 'role');

            for (const [fullKey, value] of Object.entries(this.values)) {
              if (
                fullKey.endsWith('>group-id') &&
                fullKey.startsWith('page:') &&
                value === groupId
              ) {
                const key = splitStr(fullKey, '>', 2)[0];
                const pageId = splitStr(key, ':', 2)[1];

                this._resubscribe('page', pageId, 'encrypted-absolute-title');
                this._resubscribe('page', pageId, 'encrypted-relative-title');
                this._resubscribe(
                  'page',
                  pageId,
                  'encrypted-symmetric-keyring',
                );

                this._resubscribe('page', pageId, 'permanent-deletion-date');

                this._resubscribe('page-snaphots', pageId, 'infos');
              }
            }
          }

          if (!(fullKey in this.subscriptions)) {
            continue;
          }

          this.values[fullKey] = value;

          this.changed.add(fullKey);
          void nextTick(() => this.changed.delete(fullKey));

          this.pending.get(fullKey)?.resolve(value);
          this.pending.delete(fullKey);

          for (const ctx of this.subscriptions[fullKey]) {
            ctx.changed.add(fullKey);
            void nextTick(() => ctx.changed.delete(fullKey));

            ctx.pending.delete(fullKey);
          }

          this._logger
            .sub('_handleDataNotification')
            .info(`${fullKey}: %o`, value);
        }
      }
      private async _handleUserNotification(decoder: decoding.Decoder) {
        const notifObj: DeepNotesNotification = unpack(
          decoding.readVarUint8Array(decoder),
        );

        pagesStore().notifications.items.unshift(notifObj);

        const symmetricKey = wrapSymmetricKey(
          internals.keyPair.decrypt(
            base64ToBytes(notifObj.encryptedSymmetricKey),
          ),
        );

        const notifContent = unpack(
          symmetricKey.decrypt(base64ToBytes(notifObj.encryptedContent), {
            padding: true,
            associatedData: { context: 'UserNotificationContent' },
          }),
        );

        this._logger
          .sub('_handleUserNotification')
          .info('notifObj: %o', notifObj);
        this._logger
          .sub('_handleUserNotification')
          .info('content: %o', notifContent);

        if (notifContent.agentId != null) {
          pagesStore().groups[notifContent.groupId]?.userIds.add(
            notifContent.agentId,
          );
        }

        if (notifContent.patientId != null) {
          pagesStore().groups[notifContent.groupId]?.userIds.add(
            notifContent.patientId,
          );
        }

        const notifInfo = await getNotificationInfo(notifObj, notifContent);

        $quasar().notify({
          ...notifInfo,

          actions: notifInfo.actions,
        });
      }

      isSynced<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof typeof dataHashes[DataPrefix_]['fields'],
          string
        > = Extract<keyof typeof dataHashes[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, field: DataField) {
        const fullKey = getFullKey(prefix, suffix, field);

        this.markAsDependencies([fullKey]);

        return fullKey in this.subscriptions && fullKey in this.values;
      }

      markAsDependencies(fullKeys: string[]) {
        for (const fullKey of fullKeys) {
          this.values[fullKey];
        }
      }
    },
);
export type RealtimeClient = InstanceType<ReturnType<typeof RealtimeClient>>;
