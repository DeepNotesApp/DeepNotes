/**
 * Single shared `/api/realtime-ws` connection: USER_NOTIFICATION fan-out + legacy REQUEST batches
 * (HGET / SUBSCRIBE / UNSUBSCRIBE) for Redis hash fields served by `UserRealtimeRoom`.
 */
import {
  decodeRealtimeServerBinaryMessage,
  encodeRealtimeClientRequest,
  RealtimeCommandType,
  unpackRealtimeDataNotificationItems,
  unpackRealtimeResponseValues,
  type RealtimeClientCommand,
} from "@deepnotes/realtime-wire";
import { ref, type Ref } from "vue";

export const realtimeUserWsConnected: Ref<boolean> = ref(false);

type UserNotificationHandler = (packedNotification: Uint8Array) => void | Promise<void>;

const userNotificationHandlers = new Set<UserNotificationHandler>();

/** `prefix:suffix>field` → subscribers (DATA_NOTIFICATION). */
const fieldSubscribers = new Map<string, Set<(value: unknown) => void>>();

let socket: WebSocket | null = null;
let commandIdSeq = 0;

type HgetWaiter = {
  pendingIds: Set<number>;
  result: Map<number, unknown>;
  resolve: (m: Map<number, unknown>) => void;
};

const hgetWaitQueue: HgetWaiter[] = [];

let hgetSerial = Promise.resolve();

export function realtimeFullKey(
  prefix: string,
  suffix: string,
  field: string,
): string {
  return `${prefix}:${suffix}>${field}`;
}

export function subscribeRealtimeUserNotification(
  handler: UserNotificationHandler,
): () => void {
  userNotificationHandlers.add(handler);
  return () => {
    userNotificationHandlers.delete(handler);
  };
}

export function subscribeRealtimeHashField(
  prefix: string,
  suffix: string,
  field: string,
  handler: (value: unknown) => void,
): () => void {
  const fk = realtimeFullKey(prefix, suffix, field);
  let set = fieldSubscribers.get(fk);
  if (set == null) {
    set = new Set();
    fieldSubscribers.set(fk, set);
  }
  set.add(handler);
  return () => {
    const s = fieldSubscribers.get(fk);
    s?.delete(handler);
    if (s != null && s.size === 0) {
      fieldSubscribers.delete(fk);
    }
  };
}

function dispatchDataNotification(items: ReturnType<typeof unpackRealtimeDataNotificationItems>): void {
  for (const it of items) {
    const fk = realtimeFullKey(it.prefix, it.suffix, it.field);
    const subs = fieldSubscribers.get(fk);
    if (subs == null) {
      continue;
    }
    for (const h of subs) {
      try {
        h(it.value);
      } catch {
        // ignore subscriber errors
      }
    }
  }
}

async function dispatchUserNotifications(
  packed: Uint8Array,
): Promise<void> {
  for (const h of userNotificationHandlers) {
    try {
      await h(packed);
    } catch {
      // ignore
    }
  }
}

function onBinaryMessage(data: ArrayBuffer): void {
  const decoded = decodeRealtimeServerBinaryMessage(new Uint8Array(data));
  if (decoded == null) {
    return;
  }
  if (decoded.kind === "user-notification") {
    void dispatchUserNotifications(decoded.packedNotification);
    return;
  }
  if (decoded.kind === "response") {
    const rows = unpackRealtimeResponseValues(decoded);
    const head = hgetWaitQueue[0];
    if (head != null) {
      for (const { commandId, value } of rows) {
        if (head.pendingIds.has(commandId)) {
          head.result.set(commandId, value);
          head.pendingIds.delete(commandId);
        }
      }
      if (head.pendingIds.size === 0) {
        hgetWaitQueue.shift();
        head.resolve(head.result);
      }
    }
    return;
  }
  if (decoded.kind === "data-notification") {
    dispatchDataNotification(unpackRealtimeDataNotificationItems(decoded));
  }
}

function teardownSocket(): void {
  if (socket != null) {
    socket.close();
    socket = null;
  }
  realtimeUserWsConnected.value = false;
  for (const w of hgetWaitQueue.splice(0)) {
    w.resolve(new Map());
  }
}

/**
 * Ensures the realtime WebSocket is open (cookie-auth upgrade). No-op for SSR.
 */
export function ensureRealtimeUserWs(): void {
  if (typeof window === "undefined") {
    teardownSocket();
    return;
  }
  if (socket != null && socket.readyState === WebSocket.OPEN) {
    return;
  }
  teardownSocket();
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${window.location.host}/api/realtime-ws`;
  const ws = new WebSocket(url);
  socket = ws;
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    realtimeUserWsConnected.value = true;
  };
  ws.onclose = () => {
    realtimeUserWsConnected.value = false;
    socket = null;
    for (const w of hgetWaitQueue.splice(0)) {
      w.resolve(new Map());
    }
  };
  ws.onerror = () => {
    realtimeUserWsConnected.value = false;
  };
  ws.onmessage = (ev: MessageEvent) => {
    if (!(ev.data instanceof ArrayBuffer)) {
      return;
    }
    onBinaryMessage(ev.data);
  };
}

export function disconnectRealtimeUserWs(): void {
  teardownSocket();
}

export type RealtimeBatchResult = {
  /** msgpack-unpacked HGET values keyed by legacy command id. */
  byCommandId: Map<number, unknown>;
  /** Same length as the request: index → HGET value, else `undefined`. */
  hgetValuesInOrder: unknown[];
};

/**
 * Sends a legacy REQUEST batch. Resolves with HGET payloads (msgpack-unpacked).
 * SERIALIZED across callers so RESPONSE frames stay aligned with waiters.
 * SUBSCRIBE / UNSUBSCRIBE / HSET run in the same batch but only HGET keys populate the result.
 */
export function sendRealtimeRequestBatch(
  commands: RealtimeClientCommand[],
): Promise<RealtimeBatchResult> {
  const empty = (): RealtimeBatchResult => ({
    byCommandId: new Map(),
    hgetValuesInOrder: commands.map(() => undefined),
  });
  const ws = socket;
  if (ws == null || ws.readyState !== WebSocket.OPEN || commands.length === 0) {
    return Promise.resolve(empty());
  }

  const firstCommandId = commandIdSeq;
  commandIdSeq += commands.length;

  const hgetIds: number[] = [];
  for (let i = 0; i < commands.length; i++) {
    if (commands[i]!.type === RealtimeCommandType.HGET) {
      hgetIds.push(firstCommandId + i);
    }
  }

  const payload = encodeRealtimeClientRequest({ firstCommandId, commands });
  if (hgetIds.length === 0) {
    try {
      ws.send(payload);
    } catch {
      // ignore
    }
    return Promise.resolve(empty());
  }

  const finish = (m: Map<number, unknown>): RealtimeBatchResult => {
    const hgetValuesInOrder = commands.map((c, i) =>
      c.type === RealtimeCommandType.HGET ? m.get(firstCommandId + i) : undefined,
    );
    return { byCommandId: m, hgetValuesInOrder };
  };

  const run = (): Promise<RealtimeBatchResult> =>
    new Promise<RealtimeBatchResult>((resolve) => {
      hgetWaitQueue.push({
        pendingIds: new Set(hgetIds),
        result: new Map(),
        resolve: (m) => {
          resolve(finish(m));
        },
      });
      try {
        ws.send(payload);
      } catch {
        hgetWaitQueue.pop();
        resolve(finish(new Map()));
      }
    });

  const p = hgetSerial.then(run, run);
  hgetSerial = p.then(
    () => {},
    () => {},
  );
  return p;
}

export function buildRealtimeHget(
  prefix: string,
  suffix: string,
  field: string,
): RealtimeClientCommand {
  return {
    type: RealtimeCommandType.HGET,
    args: [prefix, suffix, field],
  };
}

export function buildRealtimeSubscribe(
  prefix: string,
  suffix: string,
  field: string,
): RealtimeClientCommand {
  return {
    type: RealtimeCommandType.SUBSCRIBE,
    args: [prefix, suffix, field],
  };
}

export function buildRealtimeUnsubscribe(
  prefix: string,
  suffix: string,
  field: string,
): RealtimeClientCommand {
  return {
    type: RealtimeCommandType.UNSUBSCRIBE,
    args: [prefix, suffix, field],
  };
}
