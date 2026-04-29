import { Hono } from "hono";

import type { Bindings } from "./bindings.js";
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
export default app;
