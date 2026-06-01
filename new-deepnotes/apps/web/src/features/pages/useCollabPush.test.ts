import { beforeAll, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import * as Y from "yjs";

import { useCollabPush } from "./useCollabPush";

vi.mock("@deepnotes/collab-wire", () => ({
  encodeDocSingleUpdateFromClient: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock("./page-collab-crypto", () => ({
  encryptPageDocUpdate: vi.fn(({ plaintext }: { plaintext: Uint8Array }) => plaintext),
}));

vi.mock("../auth/bytes", () => ({
  uint8ToBase64: vi.fn((u: Uint8Array) => Buffer.from(u).toString("base64")),
}));

describe("useCollabPush", () => {
  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  function makeWs(readyState: number = 1 /* OPEN */) {
    return {
      readyState,
      send: vi.fn(),
    } as unknown as WebSocket;
  }

  function makeOpts(overrides?: Partial<Parameters<typeof useCollabPush>[0]>) {
    const ydoc = new Y.Doc();
    // Create a small diff so flushPushWs has something to send
    const text = ydoc.getText("test");
    text.insert(0, "hello");

    const ws = makeWs();

    return {
      ydoc,
      pageId: computed(() => "page-123"),
      isAuthenticated: ref(true),
      pageKeyring: ref({ encrypt: vi.fn((p: Uint8Array) => p) } as any),
      client: {} as any,
      collabWsLive: ref(true),
      getCollabWs: () => ws,
      ...overrides,
    };
  }

  it("uses 200ms debounce for first push via WS", () => {
    const opts = makeOpts();
    const ws = opts.getCollabWs()!;
    const { schedulePush } = useCollabPush(opts);

    schedulePush();
    expect(ws.send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(ws.send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(ws.send).toHaveBeenCalledOnce();
  });

  it("batches 50 rapid edits into a single push after 200ms", () => {
    const opts = makeOpts();
    const ws = opts.getCollabWs()!;
    const { schedulePush } = useCollabPush(opts);

    // Simulate 50 rapid edits
    for (let i = 0; i < 50; i++) {
      schedulePush();
    }

    vi.advanceTimersByTime(199);
    expect(ws.send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(ws.send).toHaveBeenCalledOnce();
  });

  it("delays second push by squash window after a recent push", () => {
    const opts = makeOpts();
    const ws = opts.getCollabWs()!;
    const { schedulePush } = useCollabPush(opts);

    // First burst
    schedulePush();
    vi.advanceTimersByTime(200);
    expect(ws.send).toHaveBeenCalledOnce();

    // Rapid edits immediately after first push — should be delayed by squash window
    schedulePush();
    vi.advanceTimersByTime(200);
    // Still only 1 call because squash window (1500ms) hasn't expired
    expect(ws.send).toHaveBeenCalledOnce();

    // Advance to 1500ms after the second schedulePush
    vi.advanceTimersByTime(1300);
    expect(ws.send).toHaveBeenCalledTimes(2);
  });

  it("resets to fast debounce after squash window expires", () => {
    const opts = makeOpts();
    const ws = opts.getCollabWs()!;
    const { schedulePush } = useCollabPush(opts);

    // First push
    schedulePush();
    vi.advanceTimersByTime(200);
    expect(ws.send).toHaveBeenCalledOnce();

    // Wait for squash window to expire
    vi.advanceTimersByTime(1600);

    // Next edit should use 200ms again
    schedulePush();
    vi.advanceTimersByTime(199);
    expect(ws.send).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(ws.send).toHaveBeenCalledTimes(2);
  });

  it("falls back to REST delay when WS is not open", () => {
    const ws = makeWs(0 /* CONNECTING */);
    const opts = makeOpts({
      getCollabWs: () => ws,
      collabWsLive: ref(false),
    });
    const { schedulePush } = useCollabPush(opts);

    schedulePush();
    // REST path doesn't call ws.send; it would call client.POST
    // We just verify no WS send happens within 200ms
    vi.advanceTimersByTime(200);
    expect(ws.send).not.toHaveBeenCalled();
  });
});
