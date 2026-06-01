import {
  decodeClientCollabBinaryMessage,
  encodeDocSingleUpdateAck,
  encodeDocSingleUpdateFromServer,
  uint8ToBase64Standard,
} from "@deepnotes/collab-wire";

export type PageCollabRoomEnv = {
  COLLAB_INTERNAL_SECRET?: string;
  WORKER_SELF?: Fetcher;
};

/**
 * Durable Object: one instance per `pageId` (see `idFromName(pageId)`).
 * Relays legacy-framed Yjs doc + awareness messages; persists doc updates via worker POST.
 */
export class PageCollabRoom {
  private pageIdStr = "";

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: PageCollabRoomEnv,
  ) {}

  private log(level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) {
    console.log(JSON.stringify({
      level,
      event,
      pageId: this.pageIdStr,
      timestamp: Date.now(),
      ...data,
    }));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const pIdx = parts.indexOf("pages");
    if (
      pIdx < 0 ||
      parts[pIdx + 1] == null ||
      parts[pIdx + 2] !== "collab-ws"
    ) {
      return new Response("Bad path", { status: 400 });
    }
    this.pageIdStr = parts[pIdx + 1]!;

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("X-Verified-User-Id");
    if (userId == null || userId === "") {
      this.log("warn", "ws_connection_rejected", { reason: "missing_user_id" });
      return new Response("Unauthorized", { status: 401 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];
    server.serializeAttachment({ userId });
    this.ctx.acceptWebSocket(server);
    this.log("info", "ws_connection_accepted", { userId });
    const existingAlarm = await this.ctx.storage.getAlarm();
    if (existingAlarm == null) {
      this.ctx.storage.setAlarm(Date.now() + 30000);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    if (typeof message === "string") {
      return;
    }
    const attachment = ws.deserializeAttachment() as { userId: string } | null;
    if (attachment?.userId == null || attachment.userId === "") {
      this.log("warn", "ws_message_rejected", { reason: "missing_user_attachment" });
      return;
    }
    const buf = new Uint8Array(message);
    const decoded = decodeClientCollabBinaryMessage(buf);
    if (decoded == null) {
      this.log("warn", "ws_message_rejected", { reason: "decode_failed", userId: attachment.userId });
      return;
    }

    if (decoded.kind === "awareness") {
      await this.broadcast(ws, buf);
      return;
    }

    const encryptedUpdate = decoded.encryptedUpdate;

    const secret = this.env.COLLAB_INTERNAL_SECRET;
    const self = this.env.WORKER_SELF;
    if (secret == null || secret === "" || self == null) {
      this.log("error", "collab_misconfigured", { userId: attachment.userId });
      ws.close(1011, "Collab server misconfigured");
      return;
    }

    const startTime = Date.now();
    const res = await self.fetch(
      new Request(
        `http://collab-internal/api/internal/pages/${this.pageIdStr}/collab-ws-append`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Collab-Internal-Secret": secret,
          },
          body: JSON.stringify({
            userId: attachment.userId,
            encryptedDataBase64: uint8ToBase64Standard(encryptedUpdate),
          }),
        },
      ),
    );
    const latency = Date.now() - startTime;

    if (!res.ok) {
      this.log("error", "collab_append_failed", { 
        userId: attachment.userId, 
        status: res.status,
        latency,
      });
      if (res.status === 401 || res.status === 403) {
        ws.close(1008, "Auth revoked");
      }
      return;
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      this.log("error", "collab_parse_failed", { userId: attachment.userId, latency });
      return;
    }
    if (
      payload == null ||
      typeof payload !== "object" ||
      !("newIndex" in payload) ||
      typeof (payload as { newIndex: unknown }).newIndex !== "number"
    ) {
      this.log("error", "collab_invalid_payload", { userId: attachment.userId, latency });
      return;
    }
    const dbIndex = (payload as { newIndex: number }).newIndex;

    this.log("info", "collab_update_processed", { 
      userId: attachment.userId, 
      updateId: decoded.updateId,
      dbIndex,
      latency,
    });

    const relay = encodeDocSingleUpdateFromServer(encryptedUpdate, dbIndex);
    await this.broadcast(ws, relay);
    ws.send(
      encodeDocSingleUpdateAck({
        updateId: decoded.updateId,
        dbIndex,
      }),
    );
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) {
      return;
    }
    const secret = this.env.COLLAB_INTERNAL_SECRET;
    const self = this.env.WORKER_SELF;
    if (secret == null || secret === "" || self == null) {
      this.log("error", "alarm_misconfigured");
      this.ctx.storage.setAlarm(Date.now() + 30000);
      return;
    }

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as { userId?: string } | null;
      const userId = attachment?.userId;
      if (userId == null || userId === "") {
        ws.close(1008, "Missing user attachment");
        continue;
      }
      try {
        const res = await self.fetch(
          new Request(
            `http://collab-internal/api/internal/pages/${this.pageIdStr}/collab-ws-verify?userId=${encodeURIComponent(userId)}`,
            {
              headers: {
                "X-Collab-Internal-Secret": secret,
              },
            },
          ),
        );
        if (!res.ok) {
          ws.close(1008, "Auth revoked");
          continue;
        }
        const payload = await res.json() as unknown;
        if (
          payload == null ||
          typeof payload !== "object" ||
          !("allowed" in payload) ||
          !(payload as { allowed: boolean }).allowed
        ) {
          ws.close(1008, "Auth revoked");
        }
      } catch {
        // Skip on transient errors; next alarm will retry
      }
    }

    if (this.ctx.getWebSockets().length > 0) {
      this.ctx.storage.setAlarm(Date.now() + 30000);
    }
  }

  private async broadcast(exceptWs: WebSocket, data: Uint8Array): Promise<void> {
    const targets = this.ctx.getWebSockets().filter((w) => w !== exceptWs);
    const BATCH_SIZE = 10;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      for (const w of batch) {
        try {
          w.send(data);
        } catch {
          // ignore broken peers
        }
      }
      if (i + BATCH_SIZE < targets.length) {
        // Yield to event loop between batches to avoid DO CPU limit
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }
}
