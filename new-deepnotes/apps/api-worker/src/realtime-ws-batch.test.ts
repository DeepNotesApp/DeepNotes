import { describe, expect, it } from "vitest";

import {
  encodeRealtimeClientRequest,
  decodeRealtimeClientBinaryMessage,
  RealtimeCommandType,
} from "@deepnotes/realtime-wire";

import {
  canRealtimeHashAccess,
  executeRealtimeWsBatch,
  realtimeFullKey,
  type RealtimeHashPort,
} from "./realtime-ws-batch.js";

function createMemoryHashPort(
  initial: Record<string, Record<string, unknown>> = {},
): { port: RealtimeHashPort; snapshot: () => Record<string, Record<string, unknown>> } {
  const store = new Map<string, Record<string, unknown>>();
  for (const [k, row] of Object.entries(initial)) {
    store.set(k, { ...row });
  }
  const port: RealtimeHashPort = {
    async hmget(key, fields) {
      const row = store.get(key) ?? {};
      return fields.map((f) => {
        if (!Object.prototype.hasOwnProperty.call(row, f)) {
          return null;
        }
        return row[f] ?? null;
      });
    },
    async hset(key, entries) {
      let row = store.get(key);
      if (row == null) {
        row = {};
        store.set(key, row);
      }
      Object.assign(row, entries);
    },
  };
  return {
    port,
    snapshot: () => {
      const o: Record<string, Record<string, unknown>> = {};
      for (const [k, v] of store) {
        o[k] = { ...v };
      }
      return o;
    },
  };
}

describe("executeRealtimeWsBatch", () => {
  it("denies group/page hash access (user-only until Postgres ACL)", () => {
    expect(canRealtimeHashAccess("u1", "group", "g1")).toBe(false);
    expect(canRealtimeHashAccess("u1", "page", "p1")).toBe(false);
    expect(canRealtimeHashAccess("u1", "user", "u1")).toBe(true);
    expect(canRealtimeHashAccess("u1", "user", "u2")).toBe(false);
  });

  it("HGET returns batched hmget values for own user hash", async () => {
    const { port } = createMemoryHashPort({
      "user:u1": { email: "a@b.c", plan: "pro" },
    });
    const req = encodeRealtimeClientRequest({
      firstCommandId: 1,
      commands: [
        {
          type: RealtimeCommandType.HGET,
          args: ["user", "u1", "email"],
        },
        {
          type: RealtimeCommandType.HGET,
          args: ["user", "u1", "plan"],
        },
      ],
    });
    const decoded = decodeRealtimeClientBinaryMessage(req);
    if (decoded == null) {
      throw new Error("decode");
    }
    const hooks = { subscribeField: () => {}, unsubscribeField: () => {} };
    const out = await executeRealtimeWsBatch({
      userId: "u1",
      decoded,
      redis: port,
      hooks,
    });
    expect(out.responseBytes).not.toBeNull();
    expect(out.subscribeNotifyBytes).toBeNull();
    expect(out.hsetBroadcastItems).toEqual([]);
  });

  it("SUBSCRIBE registers hook and sends initial DATA_NOTIFICATION", async () => {
    const { port } = createMemoryHashPort({
      "user:u1": { email: "x@y.z" },
    });
    const subs: string[] = [];
    const req = encodeRealtimeClientRequest({
      firstCommandId: 0,
      commands: [
        {
          type: RealtimeCommandType.SUBSCRIBE,
          args: ["user", "u1", "email"],
        },
      ],
    });
    const decoded = decodeRealtimeClientBinaryMessage(req);
    if (decoded == null) {
      throw new Error("decode");
    }
    const out = await executeRealtimeWsBatch({
      userId: "u1",
      decoded,
      redis: port,
      hooks: {
        subscribeField: (fk) => {
          subs.push(fk);
        },
        unsubscribeField: () => {},
      },
    });
    expect(subs).toEqual([realtimeFullKey("user", "u1", "email")]);
    expect(out.subscribeNotifyBytes).not.toBeNull();
  });

  it("HSET notifies broadcast list items for subscribed fan-out handled by DO", async () => {
    const { port } = createMemoryHashPort();
    const req = encodeRealtimeClientRequest({
      firstCommandId: 10,
      commands: [
        {
          type: RealtimeCommandType.HSET,
          args: ["user", "u1", "email", "new@mail"],
        },
      ],
    });
    const decoded = decodeRealtimeClientBinaryMessage(req);
    if (decoded == null) {
      throw new Error("decode");
    }
    const out = await executeRealtimeWsBatch({
      userId: "u1",
      decoded,
      redis: port,
      hooks: { subscribeField: () => {}, unsubscribeField: () => {} },
    });
    expect(out.hsetBroadcastItems).toHaveLength(1);
    expect(out.hsetBroadcastItems[0]?.fullKey).toBe(
      realtimeFullKey("user", "u1", "email"),
    );
  });
});
