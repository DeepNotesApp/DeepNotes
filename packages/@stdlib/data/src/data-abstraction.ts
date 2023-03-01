import { objFromEntries } from '@stdlib/misc';
import { allSettledResults } from '@stdlib/misc';
import {
  bytesToText,
  coalesce,
  equalUint8Arrays,
  splitStr,
} from '@stdlib/misc';
import type { Cluster, Redis, Result } from 'ioredis';
import { pack, unpack } from 'msgpackr';
import type NodeCache from 'node-cache';
import type { TransactionOrKnex } from 'objection';
import { Model } from 'objection';

import type { DataField } from './data-field';
import type { DataHash, DataHashes } from './data-hash';
import { getSelfPublisherIdBytes } from './data-publishing';
import { mainLogger } from './logger';

export const classLogger = mainLogger().sub('DataAbstraction');

export const DEFAULT_LOCAL_TTL = 1 * 24 * 60 * 60; // 1 day
export const DEFAULT_REMOTE_TTL = 7 * 24 * 60 * 60; // 7 days

interface FieldInfo {
  name: string;
  fullKey: string;
  infos: DataField | undefined;
  value?: any;
  valueBuffer?: Uint8Array;
}

export interface HMGetParams {
  trx?: TransactionOrKnex;
  dtrx?: DataTransaction;
}
interface HMGetInternalParams extends HMGetParams {
  prefix: string;
  suffix: string;
  key: string;

  dataHash: DataHash | undefined;

  fields: FieldInfo[];
  remainingFields: FieldInfo[];

  dtrx: DataTransaction;
}

export interface HMSetParams {
  cacheOnly?: boolean;

  trx?: TransactionOrKnex;
  dtrx?: DataTransaction;

  origin?: any;
}
interface HMSetInternalParams extends HMSetParams {
  prefix: string;
  suffix: string;
  key: string;

  dataHash: DataHash | undefined;

  fields: FieldInfo[];

  dtrx: DataTransaction;

  model: any;
}

export interface DataUpdateParams {
  prefix: string;
  suffix: string;
  key: string;
  field: string;

  value: any;

  origin?: any;
}
export type DataUpdateListener = (params: DataUpdateParams) => void;

export class DataTransaction {
  readonly operations: (() => PromiseLike<any>)[] = [];

  trx?: TransactionOrKnex;

  constructor(trx?: TransactionOrKnex) {
    this.trx = trx;
  }

  async commit() {
    await Promise.all(this.operations.map((operation) => operation()));
  }
}

declare module 'ioredis' {
  interface RedisCommander<Context> {
    hsetxx(key: string, ...fieldsAndValues: any[]): Result<string, Context>;

    expiremember(
      key: string,
      subkey: string,
      seconds: number,
    ): Result<number, Context>;
  }
}

export class DataAbstraction<
  DataHashes_ extends DataHashes = any,
  DataPrefix extends Extract<keyof DataHashes_, string> = Extract<
    keyof DataHashes_,
    string
  >,
> {
  private readonly _fullKeysToListenersMap: Record<
    string,
    Set<DataUpdateListener>
  > = {};
  private readonly _listenersToFullKeysMap = new Map<
    DataUpdateListener,
    string
  >();

  constructor(
    readonly dataHashes: DataHashes_,
    readonly nodeCache: NodeCache,
    readonly redis: Redis | Cluster,
    readonly sub: Redis | Cluster,
  ) {
    this.redis.defineCommand('expiremember', {
      numberOfKeys: 1,

      lua: "return redis.call('expiremember', KEYS[1], ARGV[1], ARGV[2])",
    });

    this.redis.defineCommand('hsetxx', {
      numberOfKeys: 1,

      lua: `
        local key = KEYS[1]

        for i = 1, #ARGV, 2 do
          local field = ARGV[i]
          local value = ARGV[i + 1]

          if redis.call('hexists', key, field) == 1 then
            redis.call('hset', key, field, value)
          end
        end
      `,
    });

    this.sub.on(
      'messageBuffer',
      async (channelBuffer: Buffer, messageBuffer: Buffer) => {
        if (
          equalUint8Arrays(
            messageBuffer.subarray(0, getSelfPublisherIdBytes().length),
            getSelfPublisherIdBytes(),
          )
        ) {
          classLogger.info(`Ignored self message`);
          return;
        }

        const channelStr = bytesToText(channelBuffer);

        const prefix = splitStr(channelStr, '|', 2)[0];

        messageBuffer = messageBuffer.subarray(
          getSelfPublisherIdBytes().length,
        );

        if (prefix === 'local-cache-update') {
          const values: Record<string, any> = unpack(messageBuffer);

          for (const [fullKey, value] of Object.entries(values)) {
            classLogger.sub('Local cache update').info(`${fullKey}: %o`, value);

            this.nodeCache.set(fullKey, value);
          }
        } else if (prefix === 'local-cache-clear') {
          classLogger.sub('Local cache clear').info('Clearing local cache');

          this.nodeCache.data = {};
        } else if (prefix === 'data-update') {
          const fullKey = channelStr.substring('data-update|'.length);
          const [key, field] = splitStr(fullKey, '>', 2);
          const [prefix, suffix] = splitStr(key, ':', 2);

          const value = unpack(messageBuffer);

          classLogger.sub('Data update').info(`${fullKey}: %o`, value);

          this._handleDataUpdate({
            prefix,
            suffix,
            key,
            field,

            value,
          });
        }
      },
    );

    void this.sub.subscribe('local-cache-update', 'local-cache-clear');
  }

  // Get

  async mhgetCoalesce(
    items: [DataPrefix, string, string][],
    params?: HMGetParams,
  ) {
    const results = await this.mhget(items, params);

    return coalesce(...results);
  }
  mhget(items: [DataPrefix, string, string][], params?: HMGetParams) {
    return allSettledResults(
      items.map(([prefix, suffix, key]) =>
        this.hget(prefix, suffix, key as any, params),
      ),
    );
  }
  async hget<
    DataPrefix_ extends DataPrefix,
    DataField_ extends Extract<
      keyof DataHashes_[DataPrefix_]['fields'],
      string
    > = Extract<keyof DataHashes_[DataPrefix_]['fields'], string>,
  >(
    prefix: DataPrefix_,
    suffix: string,
    field: DataField_,
    params?: HMGetParams,
  ) {
    return (await this.hmget(prefix, suffix, [field], params))[0] as any;
  }
  async hmget<
    DataPrefix_ extends DataPrefix,
    DataField_ extends Extract<
      keyof DataHashes_[DataPrefix_]['fields'],
      string
    > = Extract<keyof DataHashes_[DataPrefix_]['fields'], string>,
  >(
    prefix: DataPrefix_,
    suffix: string,
    fields: DataField_[],
    params?: HMGetParams,
  ): Promise<any[]> {
    const dataHash = this.dataHashes[prefix];

    const key = `${prefix}:${suffix}`;

    const fieldInfos: FieldInfo[] = fields.map((field) => ({
      name: field,
      fullKey: `${key}>${field}`,
      infos: dataHash?.fields[field],
    }));

    const dtrx = params?.dtrx ?? new DataTransaction(params?.trx);

    await this._hmgetLocal({
      prefix,
      suffix,
      key,

      fields: fieldInfos,
      remainingFields: fieldInfos,

      dataHash,

      ...params,

      dtrx,
      trx: dtrx.trx,
    });

    // Reset remote cache TTLs

    this.addToTransaction(dtrx, () => {
      for (const field of fieldInfos) {
        void this.redis.expiremember(key, field.name, DEFAULT_REMOTE_TTL);
      }
    });

    if (params?.dtrx == null) {
      await dtrx.commit();
    }

    return fieldInfos.map((fieldInfo) => fieldInfo.value);
  }
  private async _hmgetLocal(params: HMGetInternalParams) {
    const { remainingFields, dtrx } = params;

    // Check local cache

    const missedFields: FieldInfo[] = [];

    for (const field of remainingFields) {
      if (field.infos?.cacheLocally && this.nodeCache.has(field.fullKey)) {
        field.value = this.nodeCache.data[field.fullKey].v;

        classLogger
          .sub('hmget')
          .info(`${field.fullKey}: Found on local cache (%o)`, field.value);
      } else {
        missedFields.push(field);
      }
    }

    if (missedFields.length > 0) {
      // Load missed values from remote cache

      params.remainingFields = missedFields;

      await this._hmgetRemote(params);

      // Save missed values on local cache

      this.addToTransaction(dtrx, () => {
        for (const field of missedFields) {
          if (field.infos?.cacheLocally) {
            classLogger
              .sub('hmget')
              .info(
                `${field.fullKey}: Saving on local cache (%o)`,
                field.value,
              );

            this.nodeCache.set(field.fullKey, field.value, DEFAULT_LOCAL_TTL);
          }
        }
      });
    }
  }
  private async _hmgetRemote(params: HMGetInternalParams) {
    const { key, remainingFields, dtrx } = params;

    // Check remote cache

    const valueBuffers = await this.redis.hmgetBuffer(
      key,
      ...remainingFields.map((field) => field.name),
    );

    const missedFields: FieldInfo[] = [];

    for (let i = 0; i < remainingFields.length; i++) {
      if (valueBuffers[i] != null) {
        remainingFields[i].value = unpack(valueBuffers[i]!);

        classLogger
          .sub('hmget')
          .info(
            `${remainingFields[i].fullKey}: Found on remote cache (%o)`,
            remainingFields[i].value,
          );
      } else {
        missedFields.push(remainingFields[i]);
      }
    }

    if (missedFields.length > 0) {
      // Load missed values from database

      params.remainingFields = missedFields;

      await this._hmgetDatabase(params);

      // Save missed values on remote cache

      this.addToTransaction(dtrx, async () => {
        const missedValues = objFromEntries(
          missedFields.map((field) => [
            field.name,
            Buffer.from(pack(field.value)),
          ]),
        );

        classLogger
          .sub('hmget')
          .info(`${key}: Saving on remote cache (%o)`, missedValues);

        await this.redis.hset(key, missedValues);
      });
    }
  }
  private async _hmgetDatabase(params: HMGetInternalParams) {
    const { suffix, dataHash, remainingFields, trx } = params;

    // Gather columns from missed fields

    const columns = new Set<string>();

    for (const field of remainingFields) {
      for (const column of field.infos?.columns ?? []) {
        columns.add(column);
      }
    }

    // Load model from database

    let model: any;

    try {
      model = await dataHash?.get({
        suffix,

        columns: Array.from(columns),

        trx,
      });
    } catch (error) {
      classLogger.sub('hmget').error(error);
    }

    // Get values from model

    await Promise.allSettled(
      remainingFields.map(async (field) => {
        if (model != null) {
          classLogger
            .sub('hmget')
            .info(`${field.fullKey}: Loaded from database`);
        } else {
          classLogger
            .sub('hmget')
            .info(`${field.fullKey}: Not found on database`);
        }

        field.value =
          (await field.infos?.get?.({
            model,
            suffix,
            dataAbstraction: this,
          })) ?? model?.[field.infos?.columns?.[0] as any];
      }),
    );
  }

  // Set

  async insert<
    DataPrefix_ extends DataPrefix,
    Model extends DataHashes_[DataPrefix_]['model'],
  >(
    prefix: DataPrefix_,
    suffix: string,
    model: Partial<InstanceType<Awaited<ReturnType<Model>>>>,
    params?: {
      cacheOnly?: boolean;

      trx?: TransactionOrKnex;
      dtrx?: DataTransaction;
    },
  ) {
    let result;

    if (!params?.cacheOnly) {
      result = await (await this.dataHashes[prefix].model())
        .query(params?.dtrx?.trx ?? params?.trx)
        .insert(model);
    }

    const values = objFromEntries(
      await Promise.all(
        Object.entries(this.dataHashes[prefix]?.fields ?? {}).map(
          async ([name, field]) => {
            let value: any;

            try {
              value =
                (await field?.get?.({
                  model,
                  suffix,
                  dataAbstraction: this,
                })) ?? model?.[field?.columns?.[0] as any];
            } catch (error) {
              //
            }

            return [name, value];
          },
        ),
      ),
    );

    await this.hmset(prefix, suffix, values, {
      ...params,

      cacheOnly: true,
    });

    return result;
  }

  async patch<
    DataPrefix_ extends DataPrefix,
    Model extends DataHashes_[DataPrefix_]['model'],
  >(
    prefix: DataPrefix_,
    suffix: string,
    model: Partial<InstanceType<Awaited<ReturnType<Model>>>>,
    params?: {
      cacheOnly?: boolean;

      trx?: TransactionOrKnex;
      dtrx?: DataTransaction;
    },
  ) {
    let result;

    if (!params?.cacheOnly) {
      result = await (
        await this.dataHashes[prefix].model()
      )
        .query(params?.dtrx?.trx ?? params?.trx)
        .findById(splitStr(suffix, ':'))
        .patch(model);
    }

    const values: Record<string, any> = {};

    await Promise.allSettled(
      Object.entries(this.dataHashes[prefix].fields).map(
        async ([fieldName, fieldInfos]) => {
          let modelHasAllFieldColumns = true;

          for (const column of fieldInfos.columns ?? []) {
            if (!(column in model)) {
              modelHasAllFieldColumns = false;
              break;
            }
          }

          if (modelHasAllFieldColumns) {
            values[fieldName] =
              (await fieldInfos.get?.({
                model,
                suffix,
                dataAbstraction: this,
              })) ?? model[fieldInfos.columns?.[0] as any];
          }
        },
      ),
    );

    await this.hmset(prefix, suffix, values, {
      ...params,

      cacheOnly: true,
    });

    return result;
  }

  async delete(
    prefix: DataPrefix,
    suffix: string,
    params?: {
      cacheOnly?: boolean;

      trx?: TransactionOrKnex;
      dtrx?: DataTransaction;
    },
  ) {
    try {
      // Delete on database

      if (!params?.cacheOnly) {
        await (
          await this.dataHashes[prefix].model()
        )
          .query(params?.dtrx?.trx ?? params?.trx)
          .findById(splitStr(suffix, ':'))
          .delete();
      }

      const values = objFromEntries(
        await Promise.all(
          Object.entries(this.dataHashes[prefix]?.fields ?? {}).map(
            async ([name, field]) => {
              let value: any;

              try {
                value = await field?.get?.({
                  model: undefined,
                  suffix,
                  dataAbstraction: this,
                });
              } catch (error) {
                //
              }

              return [name, value];
            },
          ),
        ),
      );

      // Delete on cache

      await this.hmset(prefix, suffix, values, {
        ...params,

        cacheOnly: true,
      });
    } catch (error) {
      classLogger.sub('del').error(error);
    }
  }

  async hmset<
    DataPrefix_ extends DataPrefix,
    DataField_ extends Extract<
      keyof DataHashes_[DataPrefix_]['fields'],
      string
    > = Extract<keyof DataHashes_[DataPrefix_]['fields'], string>,
  >(
    prefix: DataPrefix_,
    suffix: string,
    values: Record<DataField_, any>,
    params?: HMSetParams,
  ) {
    classLogger.sub('hmset').info(`${prefix}:${suffix}: %o`, values);

    const dataHash = this.dataHashes[prefix];

    const key = `${prefix}:${suffix}`;

    const fields: FieldInfo[] = Object.entries<any>(values).map(
      ([field, value]) => ({
        name: field,
        fullKey: `${key}>${field}`,

        infos: dataHash?.fields[field],

        value: value,
        valueBuffer: Buffer.from(pack(value as any)),
      }),
    );

    const dtrx = params?.dtrx ?? new DataTransaction(params?.trx);

    const internalParams = {
      prefix,
      suffix,
      key,

      fields,

      dataHash,

      model: {},

      ...params,

      dtrx,
      trx: dtrx.trx,
    };

    await this._hmsetLocal(internalParams);

    // Publish data updates

    this.addToTransaction(dtrx, () =>
      Promise.allSettled(
        fields.map((field) => {
          if (!field.infos?.notifyUpdates) {
            return;
          }

          this._handleDataUpdate({
            prefix,
            suffix,
            key,
            field: field.name,

            value: field.value,

            origin: params?.origin,
          });

          return this.redis.publish(
            `data-update|${field.fullKey}`,
            Buffer.concat([getSelfPublisherIdBytes(), field.valueBuffer!]),
          );
        }),
      ),
    );

    if (params?.dtrx == null) {
      await dtrx.commit();
    }

    return internalParams.model;
  }
  private async _hmsetLocal(params: HMSetInternalParams) {
    const { fields, dtrx } = params;

    // Save values on remote cache

    await this._hmsetRemote(params);

    // Save values on local cache

    this.addToTransaction(dtrx, () => {
      for (const field of fields) {
        if (field.infos?.cacheLocally && this.nodeCache.has(field.fullKey)) {
          this.nodeCache.set(
            field.fullKey,
            field.value,
            this.nodeCache.getTtl(field.fullKey)!,
          );
        }
      }
    });

    // Publish local cache updates

    const localValues: Record<string, any> = {};

    for (const field of fields) {
      if (field.infos?.cacheLocally) {
        localValues[field.fullKey] = field.value;
      }
    }

    if (Object.keys(localValues).length > 0) {
      this.addToTransaction(dtrx, () =>
        this.redis.publish(
          'local-cache-update',
          Buffer.concat([getSelfPublisherIdBytes(), pack(localValues)]),
        ),
      );
    }
  }
  private async _hmsetRemote(params: HMSetInternalParams) {
    const { key, fields, dtrx } = params;

    // Save values on database

    await this._hmsetDatabase(params);

    // Save values on remote cache

    this.addToTransaction(dtrx, () =>
      this.redis.hsetxx(
        key,
        ...fields.map((field) => [field.name, field.valueBuffer]).flat(),
      ),
    );
  }
  private async _hmsetDatabase(params: HMSetInternalParams) {
    const { suffix, fields, dataHash, cacheOnly, trx } = params;

    // Create model from values

    await Promise.allSettled(
      fields.map(async (field) => {
        if (dataHash?.fields[field.name]?.set != null) {
          await dataHash?.fields[field.name]?.set?.({
            model: params.model,
            value: field.value,

            suffix,
          });
        } else if (field.infos?.columns?.length === 1) {
          params.model[field.infos.columns[0]] = field.value;
        }
      }),
    );

    if (cacheOnly) {
      return;
    }

    // Save model on database

    await dataHash?.set?.({ suffix, model: params.model, trx });
  }

  // Transactions

  addToTransaction(dtrx: DataTransaction, operation: () => any) {
    dtrx?.operations.push(operation);
  }

  async transaction<T>(
    code: (dtrx: DataTransaction) => Promise<T>,
    params?: { dtrx?: DataTransaction; db?: boolean },
  ): Promise<T> {
    if (params?.dtrx != null) {
      return await code(params.dtrx);
    }

    const dtrx = new DataTransaction();

    let result;
    let success = false;

    if (params?.db === false) {
      try {
        result = await code(dtrx);

        success = true;
      } catch (error) {
        classLogger.sub('transaction').error(error);
      }
    } else {
      await Model.transaction(async (trx) => {
        dtrx.trx = trx;

        result = await code(dtrx);

        success = true;
      });
    }

    if (success) {
      await dtrx.commit();
    }

    return result;
  }

  // Data updates

  async addUpdateListener<
    DataPrefix_ extends DataPrefix,
    DataField_ extends Extract<
      keyof DataHashes_[DataPrefix_]['fields'],
      string
    > = Extract<keyof DataHashes_[DataPrefix_]['fields'], string>,
  >(
    prefix: DataPrefix_,
    suffix: string,
    field: DataField_,
    listener: DataUpdateListener,
  ) {
    const fullKey = `${prefix}:${suffix}>${field}`;

    let listeners = this._fullKeysToListenersMap[fullKey];

    if (listeners == null) {
      listeners = new Set();

      this._fullKeysToListenersMap[fullKey] = listeners;
    }

    this._listenersToFullKeysMap.set(listener, fullKey);

    listeners.add(listener);

    if (listeners.size === 1) {
      await this.sub.subscribe(`data-update|${fullKey}`);
    }
  }
  async removeUpdateListener(listener: DataUpdateListener) {
    const fullKey = this._listenersToFullKeysMap.get(listener);

    if (fullKey == null) {
      return;
    }

    this._listenersToFullKeysMap.delete(listener);

    const listeners = this._fullKeysToListenersMap[fullKey];

    if (listeners == null) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      delete this._fullKeysToListenersMap[fullKey];

      await this.sub.unsubscribe(`data-update|${fullKey}`);
    }
  }

  private _handleDataUpdate({
    prefix,
    suffix,
    key,
    field,
    value,
    origin,
  }: DataUpdateParams) {
    const fullKey = `${key}>${field}`;

    classLogger.sub('handleDataUpdate').info(`${fullKey}: %o`, value);

    for (const listener of this._fullKeysToListenersMap[fullKey] ?? []) {
      listener({
        prefix,
        suffix,
        key,
        field,

        value,

        origin,
      });
    }
  }
}
