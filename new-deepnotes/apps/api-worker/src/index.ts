import { Hono } from "hono";

import type { Bindings } from "./bindings.js";
import { getDbForConnectionString } from "./db-pool.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerGroupRoutes } from "./routes/groups.js";
import { registerMetaRoutes } from "./routes/meta.js";
import { registerPageRoutes } from "./routes/pages.js";
import { registerRealtimeRoutes } from "./routes/realtime.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerUserRoutes } from "./routes/users.js";

const app = new Hono<{ Bindings: Bindings }>();

registerMetaRoutes(app);
registerSessionRoutes(app);
registerUserRoutes(app);
registerGroupRoutes(app);
registerPageRoutes(app);
registerBillingRoutes(app);
registerRealtimeRoutes(app);

export { PageCollabRoom } from "./page-collab-room.js";
export { UserRealtimeRoom } from "./user-realtime-room.js";

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Bindings,
  ) {
    const hyper = env.HYPERDRIVE;
    if (hyper == null) {
      console.error(JSON.stringify({ level: "error", event: "scheduled.cleanup skipped", reason: "HYPERDRIVE binding missing" }));
      return;
    }
    const db = getDbForConnectionString(hyper.connectionString);
    const { performScheduledCleanup } = await import("@deepnotes/session");
    const result = await performScheduledCleanup({ db });
    console.log(JSON.stringify({ level: "info", event: "scheduled.cleanup completed", result }));
  },
};
