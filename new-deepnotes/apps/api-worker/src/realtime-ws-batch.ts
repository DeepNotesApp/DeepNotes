/**
 * LEGACY-compat realtime hash commands over WS (RESPONSE / DATA_NOTIFICATION).
 * `user:{id}` allowed on the isolate; `page:` / `group:` when `acl` resolves Postgres membership.
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

export type RealtimeHashAclPort = {
  resolveBatch(
    needs: Map<string, { read: boolean; write: boolean }>,
  ): Promise<Map<string, { readOk: boolean; writeOk: boolean }>>;
};

function accumulateRealtimeHashNeeds(
  meta: { cmd: RealtimeClientCommand; commandId: number }[],
): Map<string, { read: boolean; write: boolean }> {
  const needs = new Map<string, { read: boolean; write: boolean }>();
  function add(key: string, read: boolean, write: boolean): void {
    const cur = needs.get(key) ?? { read: false, write: false };
    if (read) {
      cur.read = true;
    }
    if (write) {
      cur.write = true;
    }
    needs.set(key, cur);
  }
  for (const { cmd } of meta) {
    switch (cmd.type) {
      case RealtimeCommandType.HGET: {
        const t = parseTripleArgs(cmd.args);
        if (t != null) {
          add(redisHashKey(t[0], t[1]), true, false);
        }
        break;
      }
      case RealtimeCommandType.SUBSCRIBE: {
        const t = parseTripleArgs(cmd.args);
        if (t != null) {
          add(redisHashKey(t[0], t[1]), true, false);
        }
        break;
      }
      case RealtimeCommandType.HSET: {
        const t = parseHSetArgs(cmd.args);
        if (t != null) {
          add(redisHashKey(t.prefix, t.suffix), false, true);
        }
        break;
      }
      default:
        break;
    }
  }
  return needs;
}

function syncResolveRealtimeHashAccess(
  userId: string,
  needs: Map<string, { read: boolean; write: boolean }>,
): Map<string, { readOk: boolean; writeOk: boolean }> {
  const out = new Map<string, { readOk: boolean; writeOk: boolean }>();
  for (const [key, need] of needs) {
    const i = key.indexOf(":");
    const prefix = i > 0 ? key.slice(0, i) : "";
    const suffix = i > 0 ? key.slice(i + 1) : "";
    const allowed =
      prefix !== "" && canRealtimeHashAccess(userId, prefix, suffix);
    out.set(key, {
      readOk: !need.read || allowed,
      writeOk: !need.write || allowed,
    });
  }
  return out;
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
  acl: RealtimeHashAclPort | null;
}): Promise<ExecuteRealtimeWsBatchResult> {
  const { userId, decoded, redis, hooks, acl } = input;
  const meta = decoded.commands.map((cmd, i) => ({
    cmd,
    commandId: decoded.firstCommandId + i,
  }));

  const needs = accumulateRealtimeHashNeeds(meta);
  const resolved =
    needs.size === 0
      ? new Map<string, { readOk: boolean; writeOk: boolean }>()
      : acl != null
        ? await acl.resolveBatch(needs)
        : syncResolveRealtimeHashAccess(userId, needs);

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
    if (!resolved.get(redisHashKey(prefix, suffix))?.readOk) {
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
        if (!resolved.get(redisHashKey(t.prefix, t.suffix))?.writeOk) {
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
        if (!resolved.get(redisHashKey(prefix, suffix))?.readOk) {
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
