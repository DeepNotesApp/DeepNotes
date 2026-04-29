import { Redis } from "@upstash/redis";
import {
  decodeRealtimeClientBinaryMessage,
  encodeRealtimeServerDataNotification,
  encodeUserNotificationServerMessage,
} from "@deepnotes/realtime-wire";
import { resolveRealtimeHashFieldAccess } from "@deepnotes/session";

import {
  executeRealtimeWsBatch,
  type RealtimeHashAclPort,
  type RealtimeHashPort,
} from "./realtime-ws-batch.js";
import { getDbForConnectionString } from "./db-pool.js";

export type UserRealtimeRoomEnv = {
  REALTIME_INTERNAL_SECRET?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  /** When set, `page:` / `group:` hash REQUEST batches use Postgres-backed ACL. */
  HYPERDRIVE?: Hyperdrive;
};

/**
 * Durable Object: one instance per `userId` (see `idFromName(userId)`).
 * - Legacy-framed `USER_NOTIFICATION` fan-out (internal POST).
 * - Optional Upstash Redis `user:{userId}` hash HGET/HSET/SUBSCRIBE (legacy REQUEST batch).
 */
export class UserRealtimeRoom {
  private _redis: Redis | null | undefined;
  /** `fullKey` (`prefix:suffix>field`) → subscribed sockets */
  private readonly _fieldSubs = new Map<string, Set<WebSocket>>();
  /** WebSocket → keys it subscribed to (cleanup on close) */
  private readonly _subsByWs = new Map<WebSocket, Set<string>>();

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: UserRealtimeRoomEnv,
  ) {}

  private getRedis(): Redis | null {
    if (this._redis !== undefined) {
      return this._redis;
    }
    const url = this.env.UPSTASH_REDIS_REST_URL;
    const token = this.env.UPSTASH_REDIS_REST_TOKEN;
    if (url == null || url === "" || token == null || token === "") {
      this._redis = null;
      return null;
    }
    this._redis = new Redis({ url, token });
    return this._redis;
  }

  private hashPort(): RealtimeHashPort | null {
    const r = this.getRedis();
    if (r == null) return null;
    return {
      hmget: async (key, fields) => {
        if (fields.length === 0) {
          return [];
        }
        const got = await r.hmget(
          key,
          ...(fields as [string, ...string[]]),
        );
        if (got == null) {
          return fields.map(() => null);
        }
        const obj = got as Record<string, unknown>;
        return fields.map((f) => {
          if (!Object.prototype.hasOwnProperty.call(obj, f)) {
            return null;
          }
          return obj[f] ?? null;
        });
      },
      hset: async (key, entries) => {
        await r.hset(key, entries);
      },
    };
  }

  private addSubscription(fullKey: string, ws: WebSocket): void {
    let set = this._fieldSubs.get(fullKey);
    if (set == null) {
      set = new Set();
      this._fieldSubs.set(fullKey, set);
    }
    set.add(ws);
    let ks = this._subsByWs.get(ws);
    if (ks == null) {
      ks = new Set();
      this._subsByWs.set(ws, ks);
    }
    ks.add(fullKey);
  }

  private removeSubscription(fullKey: string, ws: WebSocket): void {
    const set = this._fieldSubs.get(fullKey);
    if (set == null) {
      return;
    }
    set.delete(ws);
    if (set.size === 0) {
      this._fieldSubs.delete(fullKey);
    }
    const ks = this._subsByWs.get(ws);
    ks?.delete(fullKey);
    if (ks != null && ks.size === 0) {
      this._subsByWs.delete(ws);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname.endsWith("/internal/realtime/push")
    ) {
      const secret = request.headers.get("X-Realtime-Internal-Secret");
      const expected = this.env.REALTIME_INTERNAL_SECRET;
      if (expected == null || expected === "" || secret !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return new Response("Bad JSON", { status: 400 });
      }
      if (
        body == null ||
        typeof body !== "object" ||
        !("framedBase64" in body) ||
        typeof (body as { framedBase64: unknown }).framedBase64 !== "string"
      ) {
        return new Response("Invalid body", { status: 400 });
      }
      const framed = base64ToUint8Standard(
        (body as { framedBase64: string }).framedBase64,
      );
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(framed);
        } catch {
          // ignore
        }
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("X-Verified-User-Id");
    if (userId == null || userId === "") {
      return new Response("Unauthorized", { status: 401 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];
    server.serializeAttachment({ userId });
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    if (typeof message === "string") {
      return;
    }
    const attachment = ws.deserializeAttachment() as { userId?: string } | null;
    const userId = attachment?.userId;
    if (userId == null || userId === "") {
      return;
    }

    const decoded = decodeRealtimeClientBinaryMessage(new Uint8Array(message));
    if (decoded == null) {
      return;
    }

    try {
      const hyper = this.env.HYPERDRIVE;
      const acl: RealtimeHashAclPort | null =
        hyper != null
          ? {
              resolveBatch: (needs) =>
                resolveRealtimeHashFieldAccess({
                  db: getDbForConnectionString(hyper.connectionString),
                  userId,
                  needs,
                }),
            }
          : null;

      const out = await executeRealtimeWsBatch({
        userId,
        decoded,
        redis: this.hashPort(),
        acl,
        hooks: {
          subscribeField: (fk) => {
            this.addSubscription(fk, ws);
          },
          unsubscribeField: (fk) => {
            this.removeSubscription(fk, ws);
          },
        },
      });

      if (out.responseBytes != null) {
        ws.send(out.responseBytes);
      }
      if (out.subscribeNotifyBytes != null) {
        ws.send(out.subscribeNotifyBytes);
      }

      for (const item of out.hsetBroadcastItems) {
        const subs = this._fieldSubs.get(item.fullKey);
        if (subs == null || subs.size === 0) {
          continue;
        }
        const payload = encodeRealtimeServerDataNotification({
          items: [
            {
              prefix: item.prefix,
              suffix: item.suffix,
              field: item.field,
              value: item.value,
            },
          ],
        });
        for (const other of subs) {
          if (other === ws) {
            continue;
          }
          try {
            other.send(payload);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore malformed/partial Redis failures
    }
  }

  webSocketClose(ws: WebSocket): void | Promise<void> {
    const keys = this._subsByWs.get(ws);
    if (keys != null) {
      for (const fk of keys) {
        const set = this._fieldSubs.get(fk);
        if (set != null) {
          set.delete(ws);
          if (set.size === 0) {
            this._fieldSubs.delete(fk);
          }
        }
      }
      this._subsByWs.delete(ws);
    }
  }
}

function base64ToUint8Standard(b64: string): Uint8Array {
  if (b64 === "") {
    return new Uint8Array(0);
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function frameUserNotificationForWire(
  notificationInnerPacked: Uint8Array,
): Uint8Array {
  return encodeUserNotificationServerMessage(notificationInnerPacked);
}
