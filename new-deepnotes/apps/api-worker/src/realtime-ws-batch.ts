/**
 * LEGACY-compat realtime hash commands over WS (RESPONSE / DATA_NOTIFICATION).
 * Only `user:{userId}` Redis hashes are allowed for parity until group/page ACL is wired via Postgres.
 */
import {
  RealtimeCommandType,
  encodeRealtimeServerDataNotification,
  encodeRealtimeServerResponse,
  type DecodedRealtimeClientRequest,
  type RealtimeClientCommand,
} from "@deepnotes/realtime-wire";

export function redisHashKey(prefix: string, suffix: string): string {
  return `${prefix}:${suffix}`;
}

/** Same as `@stdlib/misc` `getFullKey` (`prefix:suffix>field`). */
export function realtimeFullKey(
  prefix: string,
  suffix: string,
  field: string,
): string {
  return `${prefix}:${suffix}>${field}`;
}

export function canRealtimeHashAccess(
  viewerUserId: string,
  prefix: string,
  suffix: string,
): boolean {
  if (prefix === "user") return suffix === viewerUserId;
  return false;
}

export type RealtimeHashPort = {
  hmget(key: string, fields: readonly string[]): Promise<(unknown | null)[]>;
  hset(key: string, entries: Record<string, unknown>): Promise<void>;
};

type Triple = readonly [prefix: string, suffix: string, field: string];

export function parseTripleArgs(args: unknown): Triple | null {
  if (!Array.isArray(args) || args.length < 3) {
    return null;
  }
  const [p, s, f] = args;
  if (typeof p !== "string" || typeof s !== "string" || typeof f !== "string") {
    return null;
  }
  return [p, s, f];
}

export function parseHSetArgs(
  args: unknown,
): { prefix: string; suffix: string; field: string; value: unknown } | null {
  if (!Array.isArray(args) || args.length < 4) {
    return null;
  }
  const t = parseTripleArgs(args.slice(0, 3));
  if (t == null) {
    return null;
  }
  return { prefix: t[0], suffix: t[1], field: t[2], value: args[3] };
}

export type RealtimeBatchHooks = {
  subscribeField(fullKey: string): void;
  unsubscribeField(fullKey: string): void;
};

export type ExecuteRealtimeWsBatchResult = {
  responseBytes: Uint8Array | null;
  subscribeNotifyBytes: Uint8Array | null;
  hsetBroadcastItems: {
    prefix: string;
    suffix: string;
    field: string;
    fullKey: string;
    value: unknown;
  }[];
};

export async function executeRealtimeWsBatch(input: {
  userId: string;
  decoded: DecodedRealtimeClientRequest;
  redis: RealtimeHashPort | null;
  hooks: RealtimeBatchHooks;
}): Promise<ExecuteRealtimeWsBatchResult> {
  const { userId, decoded, redis, hooks } = input;
  const meta = decoded.commands.map((cmd, i) => ({
    cmd,
    commandId: decoded.firstCommandId + i,
  }));

  const hgetResponses = new Map<number, unknown>();

  type AllowedHGet = {
    commandId: number;
    prefix: string;
    suffix: string;
    field: string;
  };
  const planned: AllowedHGet[] = [];

  for (const row of meta) {
    if (row.cmd.type !== RealtimeCommandType.HGET) {
      continue;
    }
    const t = parseTripleArgs(row.cmd.args);
    if (t == null) {
      hgetResponses.set(row.commandId, undefined);
      continue;
    }
    const [prefix, suffix, field] = t;
    if (!canRealtimeHashAccess(userId, prefix, suffix)) {
      hgetResponses.set(row.commandId, undefined);
      continue;
    }
    planned.push({ commandId: row.commandId, prefix, suffix, field });
  }

  const byRedisKey = new Map<
    string,
    { rows: AllowedHGet[]; fields: string[] }
  >();
  for (const row of planned) {
    const key = redisHashKey(row.prefix, row.suffix);
    let g = byRedisKey.get(key);
    if (g == null) {
      g = { rows: [], fields: [] };
      byRedisKey.set(key, g);
    }
    g.rows.push(row);
    g.fields.push(row.field);
  }

  for (const [key, spec] of byRedisKey) {
    const vals =
      redis == null
        ? spec.fields.map(() => null)
        : await redis.hmget(key, spec.fields);
    for (let i = 0; i < spec.rows.length; i++) {
      const r = spec.rows[i]!;
      const v = vals[i];
      hgetResponses.set(r.commandId, v ?? undefined);
    }
  }

  const subscribeItems: {
    prefix: string;
    suffix: string;
    field: string;
    value: unknown;
  }[] = [];
  const hsetBroadcastItems: ExecuteRealtimeWsBatchResult["hsetBroadcastItems"] =
    [];

  async function processCommand(m: {
    cmd: RealtimeClientCommand;
    commandId: number;
  }): Promise<void> {
    const { cmd } = m;
    switch (cmd.type) {
      case RealtimeCommandType.HGET:
        return;
      case RealtimeCommandType.HSET: {
        const t = parseHSetArgs(cmd.args);
        if (t == null) {
          return;
        }
        if (!canRealtimeHashAccess(userId, t.prefix, t.suffix)) {
          return;
        }
        const fk = realtimeFullKey(t.prefix, t.suffix, t.field);
        if (redis != null) {
          await redis.hset(redisHashKey(t.prefix, t.suffix), {
            [t.field]: t.value,
          });
        }
        hsetBroadcastItems.push({
          prefix: t.prefix,
          suffix: t.suffix,
          field: t.field,
          fullKey: fk,
          value: t.value,
        });
        return;
      }
      case RealtimeCommandType.SUBSCRIBE: {
        const t = parseTripleArgs(cmd.args);
        if (t == null) {
          return;
        }
        const [prefix, suffix, field] = t;
        const fk = realtimeFullKey(prefix, suffix, field);
        if (!canRealtimeHashAccess(userId, prefix, suffix)) {
          subscribeItems.push({ prefix, suffix, field, value: undefined });
          return;
        }
        hooks.subscribeField(fk);
        let value: unknown;
        if (redis != null) {
          const vals = await redis.hmget(redisHashKey(prefix, suffix), [field]);
          value = vals[0] ?? undefined;
        } else {
          value = undefined;
        }
        subscribeItems.push({ prefix, suffix, field, value });
        return;
      }
      case RealtimeCommandType.UNSUBSCRIBE: {
        const t = parseTripleArgs(cmd.args);
        if (t == null) {
          return;
        }
        hooks.unsubscribeField(
          realtimeFullKey(t[0], t[1], t[2]),
        );
        return;
      }
      default:
        return;
    }
  }

  await Promise.all(meta.map((m) => processCommand(m)));

  const responseEntries = meta
    .filter(({ cmd }) => cmd.type === RealtimeCommandType.HGET)
    .map(({ commandId }) => ({
      commandId,
      value: hgetResponses.get(commandId),
    }));

  const responseBytes =
    responseEntries.length === 0
      ? null
      : encodeRealtimeServerResponse({
          responses: responseEntries.map(({ commandId, value }) => ({
            commandId,
            value,
          })),
        });

  const subscribeNotifyBytes =
    subscribeItems.length === 0
      ? null
      : encodeRealtimeServerDataNotification({ items: subscribeItems });

  return {
    responseBytes,
    subscribeNotifyBytes,
    hsetBroadcastItems,
  };
}
