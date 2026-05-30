import {
  decodeClientCollabBinaryMessage,
  encodeDocSingleUpdateAck,
  encodeDocSingleUpdateFromServer,
  encodePageDocSingleUpdateAck,
  encodePageDocSingleUpdateFromServer,
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
    const attachment = ws.deserializeAttachment() as { userId: string } | null;
    if (attachment?.userId == null || attachment.userId === "") {
      return;
    }
    const buf = new Uint8Array(message);
    const decoded = decodeClientCollabBinaryMessage(buf);
    if (decoded == null) {
      return;
    }

    if (decoded.kind === "awareness") {
      this.broadcast(ws, buf);
      return;
    }

    const isPageDoc = decoded.kind === "page-doc-single";
    const encryptedUpdate = decoded.encryptedUpdate;

    const secret = this.env.COLLAB_INTERNAL_SECRET;
    const self = this.env.WORKER_SELF;
    if (secret == null || secret === "" || self == null) {
      ws.close(1011, "Collab server misconfigured");
      return;
    }

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
            type: isPageDoc ? "spatial" : "prosemirror",
          }),
        },
      ),
    );

    if (!res.ok) {
      return;
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return;
    }
    if (
      payload == null ||
      typeof payload !== "object" ||
      !("newIndex" in payload) ||
      typeof (payload as { newIndex: unknown }).newIndex !== "number"
    ) {
      return;
    }
    const dbIndex = (payload as { newIndex: number }).newIndex;

    if (isPageDoc) {
      const relay = encodePageDocSingleUpdateFromServer(encryptedUpdate, dbIndex);
      this.broadcast(ws, relay);
      ws.send(
        encodePageDocSingleUpdateAck({
          updateId: decoded.updateId,
          dbIndex,
        }),
      );
    } else {
      const relay = encodeDocSingleUpdateFromServer(encryptedUpdate, dbIndex);
      this.broadcast(ws, relay);
      ws.send(
        encodeDocSingleUpdateAck({
          updateId: decoded.updateId,
          dbIndex,
        }),
      );
    }
  }

  private broadcast(exceptWs: WebSocket, data: Uint8Array): void {
    for (const w of this.ctx.getWebSockets()) {
      if (w !== exceptWs) {
        try {
          w.send(data);
        } catch {
          // ignore broken peers
        }
      }
    }
  }
}
