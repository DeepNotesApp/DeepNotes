import { encodeUserNotificationServerMessage } from "@deepnotes/realtime-wire";

export type UserRealtimeRoomEnv = {
  REALTIME_INTERNAL_SECRET?: string;
};

/**
 * Durable Object: one instance per `userId` (see `idFromName(userId)`).
 * Fans out legacy-framed `USER_NOTIFICATION` messages to this user's WebSocket clients.
 */
export class UserRealtimeRoom {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: UserRealtimeRoomEnv,
  ) {}

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
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(framed);
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
