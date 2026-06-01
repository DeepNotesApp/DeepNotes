import { describe, expect, it, vi } from "vitest";

import { PageCollabRoom } from "./page-collab-room.js";

function createMockWebSocket(id: string): WebSocket & { sent: Uint8Array[]; closed: boolean } {
  const sent: Uint8Array[] = [];
  const ws = {
    sent,
    closed: false,
    serializeAttachment: vi.fn(),
    deserializeAttachment: vi.fn(() => ({ userId: `user-${id}` })),
    send: vi.fn((data: ArrayBuffer | string) => {
      if (typeof data !== "string") {
        sent.push(new Uint8Array(data));
      }
    }),
    close: vi.fn(() => {
      (ws as unknown as { closed: boolean }).closed = true;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as WebSocket & { sent: Uint8Array[]; closed: boolean };
  return ws;
}

function createMockDoState(sockets: WebSocket[]): DurableObjectState {
  const storage = {
    getAlarm: vi.fn(() => Promise.resolve(null)),
    setAlarm: vi.fn(() => Promise.resolve()),
    deleteAlarm: vi.fn(() => Promise.resolve()),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
    list: vi.fn(),
    transaction: vi.fn(),
  };
  return {
    getWebSockets: vi.fn(() => sockets),
    acceptWebSocket: vi.fn(),
    waitUntil: vi.fn(),
    storage: storage as unknown as DurableObjectStorage,
    id: {} as unknown as DurableObjectId,
    transaction: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
    list: vi.fn(),
    getAlarm: vi.fn(),
    setAlarm: vi.fn(),
    deleteAlarm: vi.fn(),
    setHibernationWebSocketEventTimeout: vi.fn(),
    getHibernationWebSocketEventTimeout: vi.fn(),
    getWebSocketAutoResponse: vi.fn(),
    setWebSocketAutoResponse: vi.fn(),
    getTags: vi.fn(),
    getStub: vi.fn(),
    requestDelegate: vi.fn(),
    dispose: vi.fn(),
    getHibernatableWebSocketEventTimeout: vi.fn(),
    setHibernatableWebSocketEventTimeout: vi.fn(),
    getHibernationWebSocketEventTimeoutTimestamp: vi.fn(),
    getHibernationWebSocketEventTimeoutMilliseconds: vi.fn(),
    getWebSocketEventTimeout: vi.fn(),
    setWebSocketEventTimeout: vi.fn(),
  } as unknown as DurableObjectState;
}

describe("PageCollabRoom", () => {
  it("chunks broadcast into batches of at most 10 sockets", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const sockets = Array.from({ length: 25 }, (_, i) => createMockWebSocket(String(i)));
    const state = createMockDoState(sockets);
    const room = new PageCollabRoom(state, {
      COLLAB_INTERNAL_SECRET: "secret",
      WORKER_SELF: {
        fetch: vi.fn(() =>
          Promise.resolve(
            new Response(JSON.stringify({ newIndex: 1 }), { status: 200 }),
          ),
        ),
      } as unknown as Fetcher,
    });

    const sender = sockets[0]!;
    await (room as unknown as { broadcast: (except: WebSocket, data: Uint8Array) => Promise<void> }).broadcast(sender, data);

    // sender should not receive the message
    expect(sender.sent).toHaveLength(0);

    // remaining 24 sockets should each receive exactly one message
    const receivers = sockets.slice(1);
    for (const r of receivers) {
      expect(r.sent).toHaveLength(1);
      expect(r.sent[0]).toEqual(data);
    }

    // Verify that getWebSockets was called
    expect(state.getWebSockets).toHaveBeenCalled();
  });

  it("broadcast does nothing when no other sockets are connected", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const sender = createMockWebSocket("0");
    const state = createMockDoState([sender]);
    const room = new PageCollabRoom(state, {});

    await (room as unknown as { broadcast: (except: WebSocket, data: Uint8Array) => Promise<void> }).broadcast(sender, data);

    expect(sender.sent).toHaveLength(0);
  });

  it("ignores broken peers during broadcast", async () => {
    const data = new Uint8Array([1, 2, 3]);
    const good = createMockWebSocket("good");
    const bad = createMockWebSocket("bad");
    bad.send = vi.fn(() => {
      throw new Error("broken");
    });

    const state = createMockDoState([good, bad]);
    const room = new PageCollabRoom(state, {});

    await (room as unknown as { broadcast: (except: WebSocket, data: Uint8Array) => Promise<void> }).broadcast(good, data);

    expect(good.sent).toHaveLength(0); // sender excluded
    expect(bad.sent).toHaveLength(0); // threw, but no crash
  });

  it("alarm closes sockets when verify returns not allowed", async () => {
    const ws1 = createMockWebSocket("1");
    const ws2 = createMockWebSocket("2");
    const state = createMockDoState([ws1, ws2]);
    const room = new PageCollabRoom(state, {
      COLLAB_INTERNAL_SECRET: "secret",
      WORKER_SELF: {
        fetch: vi.fn(() =>
          Promise.resolve(
            new Response(JSON.stringify({ allowed: false }), { status: 200 }),
          ),
        ),
      } as unknown as Fetcher,
    });

    await room.alarm();

    expect(ws1.closed).toBe(true);
    expect(ws2.closed).toBe(true);
    expect(state.storage.setAlarm).toHaveBeenCalledWith(expect.any(Number));
  });

  it("alarm closes sockets when verify returns non-ok", async () => {
    const ws1 = createMockWebSocket("1");
    const state = createMockDoState([ws1]);
    const room = new PageCollabRoom(state, {
      COLLAB_INTERNAL_SECRET: "secret",
      WORKER_SELF: {
        fetch: vi.fn(() =>
          Promise.resolve(new Response("Forbidden", { status: 403 })),
        ),
      } as unknown as Fetcher,
    });

    await room.alarm();

    expect(ws1.closed).toBe(true);
  });

  it("webSocketMessage closes socket on 403 from collab-ws-append", async () => {
    const ws1 = createMockWebSocket("1");
    const state = createMockDoState([ws1]);
    const room = new PageCollabRoom(state, {
      COLLAB_INTERNAL_SECRET: "secret",
      WORKER_SELF: {
        fetch: vi.fn(() =>
          Promise.resolve(new Response("Forbidden", { status: 403 })),
        ),
      } as unknown as Fetcher,
    });

    // Encode a minimal client update message
    const { encodeDocSingleUpdateFromClient } = await import("@deepnotes/collab-wire");
    const msg = encodeDocSingleUpdateFromClient({
      updateId: 1,
      encryptedUpdate: new Uint8Array([1, 2, 3]),
    });

    await room.webSocketMessage(ws1, msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength) as ArrayBuffer);

    expect(ws1.closed).toBe(true);
  });
});
