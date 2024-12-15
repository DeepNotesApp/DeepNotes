import type { dataHashes, DataPrefix } from '@deeplib/data';
import { RealtimeCommandType } from '@deeplib/misc';
import { getFullKey } from '@stdlib/misc';
import { Resolvable, splitStr } from '@stdlib/misc';
import { once } from 'lodash';

export const RealtimeContext = once(
  () =>
    class {
      private readonly _logger = mainLogger.sub('RealtimeContext');

      readonly subscriptions = new Set<string>();
      readonly pending = reactive(new Set<string>());
      readonly changed = new Set<string>();

      get loading() {
        return this.pending.size > 0;
      }

      async mhgetCoalesceAsync(items: [DataPrefix, string, string][]) {
        internals.realtime.markAsDependencies(
          items.map((item) => getFullKey(...item)),
        );

        for (const item of items) {
          const value = await this.hgetAsync(item[0] as any, item[1], item[2]);

          if (value != null) {
            return value;
          }
        }
      }
      async mhgetAsync(items: [DataPrefix, string, string][]) {
        return await Promise.all(
          items.map(([prefix, suffix, field]) =>
            this.hgetAsync(prefix as any, suffix, field),
          ),
        );
      }
      async hgetAsync<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof (typeof dataHashes)[DataPrefix_]['fields'],
          string
        > = Extract<keyof (typeof dataHashes)[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, field: DataField) {
        this._subscribe(prefix, suffix, field);

        const fullKey = getFullKey(prefix, suffix, field);

        if (internals.realtime.isSynced(prefix as any, suffix, field)) {
          return internals.realtime.values[fullKey];
        }

        return await internals.realtime.pending.get(fullKey);
      }

      mhgetCoalesce(items: [DataPrefix, string, string][]) {
        for (const item of items) {
          const value = this.hget(item[0] as any, item[1], item[2]);

          if (!internals.realtime.isSynced(item[0] as any, item[1], item[2])) {
            return;
          }

          if (value != null) {
            return value;
          }
        }
      }
      mhget(items: [DataPrefix, string, string][]) {
        return items.map(([prefix, suffix, field]) =>
          this.hget(prefix as any, suffix, field),
        );
      }
      hmget<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof (typeof dataHashes)[DataPrefix_]['fields'],
          string
        > = Extract<keyof (typeof dataHashes)[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, fields: DataField[]) {
        return fields.map((field) => this.hget(prefix, suffix, field));
      }
      hget<
        DataPrefix_ extends DataPrefix,
        DataField extends Extract<
          keyof (typeof dataHashes)[DataPrefix_]['fields'],
          string
        > = Extract<keyof (typeof dataHashes)[DataPrefix_]['fields'], string>,
      >(prefix: DataPrefix_, suffix: string, field: DataField) {
        if (process.env.SERVER) {
          return;
        }

        this._subscribe(prefix, suffix, field);

        return internals.realtime.values[getFullKey(prefix, suffix, field)];
      }

      private _subscribe(prefix: DataPrefix, suffix: string, field: string) {
        const fullKey = getFullKey(prefix, suffix, field);

        if (this.subscriptions.has(fullKey)) {
          return;
        }

        this._logger.sub('subscribe').info(fullKey);

        this.subscriptions.add(fullKey);

        if (!internals.realtime.isSynced(prefix as any, suffix, field)) {
          internals.realtime.pending.set(fullKey, new Resolvable());
          this.pending.add(fullKey);
        }

        internals.realtime.subscriptions[fullKey] ??= new Set();
        internals.realtime.subscriptions[fullKey].add(this);

        if (internals.realtime.subscriptions[fullKey].size === 1) {
          internals.realtime.pushCommand({
            type: RealtimeCommandType.SUBSCRIBE,
            args: [prefix, suffix, field],
          });
        }
      }
      unsubscribe(prefix: DataPrefix, suffix: string, field: string) {
        const fullKey = getFullKey(prefix, suffix, field);

        if (!this.subscriptions.has(fullKey)) {
          return;
        }

        this._logger.sub('unsubscribe').info(fullKey);

        this.subscriptions.delete(fullKey);

        this.pending.delete(fullKey);

        internals.realtime.subscriptions[fullKey].delete(this);

        if (internals.realtime.subscriptions[fullKey].size === 0) {
          delete internals.realtime.subscriptions[fullKey];

          internals.realtime.pending.get(fullKey)?.resolve(undefined);
          internals.realtime.pending.delete(fullKey);

          delete internals.realtime.values[fullKey];

          internals.realtime.pushCommand({
            type: RealtimeCommandType.UNSUBSCRIBE,
            args: [prefix, suffix, field],
          });
        }
      }

      destroy() {
        for (const channel of this.subscriptions) {
          const [key, field] = splitStr(channel, '>', 2);
          const [prefix, suffix] = splitStr(key, ':', 2);

          this.unsubscribe(prefix as any, suffix, field);
        }
      }
    },
);
export type RealtimeContext = InstanceType<ReturnType<typeof RealtimeContext>>;

export function useRealtimeContext() {
  const ctx = new (RealtimeContext())();

  onBeforeUnmount(() => ctx.destroy());

  return ctx;
}
