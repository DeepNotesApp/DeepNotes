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
  redisHashKey,
  type RealtimeHashAclPort,
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
  it("denies page/group hash without Postgres ACL port (user-only sync)", () => {
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
      acl: null,
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
      acl: null,
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
      acl: null,
    });
    expect(out.hsetBroadcastItems).toHaveLength(1);
    expect(out.hsetBroadcastItems[0]?.fullKey).toBe(
      realtimeFullKey("user", "u1", "email"),
    );
  });

  it("HGET on page hash succeeds when ACL grants read", async () => {
    const { port } = createMemoryHashPort({
      "page:p9": { "encrypted-relative-title": "enc" },
    });
    const req = encodeRealtimeClientRequest({
      firstCommandId: 5,
      commands: [
        {
          type: RealtimeCommandType.HGET,
          args: ["page", "p9", "encrypted-relative-title"],
        },
      ],
    });
    const decoded = decodeRealtimeClientBinaryMessage(req);
    if (decoded == null) {
      throw new Error("decode");
    }
    const acl: RealtimeHashAclPort = {
      async resolveBatch(needs) {
        expect(needs.get(redisHashKey("page", "p9"))?.read).toBe(true);
        const m = new Map<string, { readOk: boolean; writeOk: boolean }>();
        m.set(redisHashKey("page", "p9"), { readOk: true, writeOk: true });
        return m;
      },
    };
    const out = await executeRealtimeWsBatch({
      userId: "u1",
      decoded,
      redis: port,
      hooks: { subscribeField: () => {}, unsubscribeField: () => {} },
      acl,
    });
    expect(out.responseBytes).not.toBeNull();
  });
});
