import { uint8ToBase64Standard } from "@deepnotes/collab-wire";

import type { Bindings } from "./bindings.js";
import { frameUserNotificationForWire } from "./user-realtime-room.js";

export async function dispatchRealtimeNotificationDeliveries(
  env: Bindings,
  deliveries: { userId: string; notificationInnerPacked: Uint8Array }[],
): Promise<void> {
  const ns = env.USER_REALTIME_ROOM;
  const secret = env.REALTIME_INTERNAL_SECRET;
  if (
    ns == null ||
    secret == null ||
    secret === "" ||
    deliveries.length === 0
  ) {
    return;
  }
  for (const d of deliveries) {
    const framed = frameUserNotificationForWire(d.notificationInnerPacked);
    const stub = ns.get(ns.idFromName(d.userId));
    await stub.fetch(
      new Request("http://internal/realtime/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Realtime-Internal-Secret": secret,
        },
        body: JSON.stringify({
          framedBase64: uint8ToBase64Standard(framed),
        }),
      }),
    );
  }
}
