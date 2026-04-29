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
import {
  buildDataUpdatePublishPayload,
  bytesToBase64,
  parseDataUpdateSubscribePayload,
  parseRealtimeFullKey,
  parseUpstashPubSubSseLine,
  realtimeDataUpdateChannel,
  upstashPublish,
} from "./realtime-redis-pubsub.js";

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
 * - Optional Upstash Redis hash **HGET/HSET/SUBSCRIBE** (legacy REQUEST batch) + **PUBLISH** on
 *   `data-update|{fullKey}` and **SSE `/subscribe`** so other isolates/users receive **DATA_NOTIFICATION**.
 */
export class UserRealtimeRoom {
  private _redis: Redis | null | undefined;
  /** 16-byte origin id for Redis pub/sub self-echo filtering (legacy `getSelfPublisherIdBytes`). */
  private _publisherIdBytes: Uint8Array | undefined;
  /** `fullKey` (`prefix:suffix>field`) → SSE bridge from Upstash `SUBSCRIBE` */
  private readonly _dataUpdateBridgeAborters = new Map<
    string,
    AbortController
  >();
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
        const restUrl = this.env.UPSTASH_REDIS_REST_URL;
        const restToken = this.env.UPSTASH_REDIS_REST_TOKEN;
        if (
          restUrl == null ||
          restUrl === "" ||
          restToken == null ||
          restToken === ""
        ) {
          return;
        }
        const pubId = this.publisherId();
        for (const [field, value] of Object.entries(entries)) {
          const fullKey = `${key}>${field}`;
          const channel = realtimeDataUpdateChannel(fullKey);
          const msg = bytesToBase64(buildDataUpdatePublishPayload(pubId, value));
          try {
            await upstashPublish(restUrl, restToken, channel, msg);
          } catch {
            // Best-effort fan-out; hash write already succeeded.
          }
        }
      },
    };
  }

  private publisherId(): Uint8Array {
    if (this._publisherIdBytes == null) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      this._publisherIdBytes = b;
    }
    return this._publisherIdBytes;
  }

  private startDataUpdateBridgeIfRedis(fullKey: string): void {
    const url = this.env.UPSTASH_REDIS_REST_URL;
    const token = this.env.UPSTASH_REDIS_REST_TOKEN;
    if (url == null || url === "" || token == null || token === "") {
      return;
    }
    if (this._dataUpdateBridgeAborters.has(fullKey)) {
      return;
    }
    const ac = new AbortController();
    this._dataUpdateBridgeAborters.set(fullKey, ac);
    void this.runDataUpdateBridgeLoop(fullKey, url, token, ac.signal);
  }

  private stopDataUpdateBridge(fullKey: string): void {
    const ac = this._dataUpdateBridgeAborters.get(fullKey);
    ac?.abort();
    this._dataUpdateBridgeAborters.delete(fullKey);
  }

  private async runDataUpdateBridgeLoop(
    fullKey: string,
    baseUrl: string,
    token: string,
    signal: AbortSignal,
  ): Promise<void> {
    const channel = realtimeDataUpdateChannel(fullKey);
    const subBase = baseUrl.replace(/\/$/, "");
    const subUrl = `${subBase}/subscribe/${encodeURIComponent(channel)}`;
    const pubId = this.publisherId();
    while (!signal.aborted) {
      try {
        const res = await fetch(subUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal,
        });
        if (!res.ok || res.body == null) {
          await sleepWhile(1500, signal);
          continue;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            const parsed = parseUpstashPubSubSseLine(line);
            if (parsed.kind !== "message") {
              continue;
            }
            if (parsed.channel !== channel) {
              continue;
            }
            const payload = parseDataUpdateSubscribePayload(
              parsed.payload,
              pubId,
            );
            if (!payload.ok || payload.fromSelf) {
              continue;
            }
            const triple = parseRealtimeFullKey(fullKey);
            if (triple == null) {
              continue;
            }
            const frame = encodeRealtimeServerDataNotification({
              items: [
                {
                  prefix: triple.prefix,
                  suffix: triple.suffix,
                  field: triple.field,
                  value: payload.value,
                },
              ],
            });
            const subs = this._fieldSubs.get(fullKey);
            if (subs == null || subs.size === 0) {
              continue;
            }
            for (const socket of subs) {
              try {
                socket.send(frame);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        if (signal.aborted) {
          break;
        }
        await sleepWhile(1500, signal);
      }
    }
  }

  private addSubscription(fullKey: string, ws: WebSocket): void {
    let set = this._fieldSubs.get(fullKey);
    const wasEmpty = set == null || set.size === 0;
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
    if (wasEmpty) {
      this.startDataUpdateBridgeIfRedis(fullKey);
    }
  }

  private removeSubscription(fullKey: string, ws: WebSocket): void {
    const set = this._fieldSubs.get(fullKey);
    if (set == null) {
      return;
    }
    set.delete(ws);
    if (set.size === 0) {
      this._fieldSubs.delete(fullKey);
      this.stopDataUpdateBridge(fullKey);
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
      for (const fk of [...keys]) {
        this.removeSubscription(fk, ws);
      }
    }
  }
}

function sleepWhile(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
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
