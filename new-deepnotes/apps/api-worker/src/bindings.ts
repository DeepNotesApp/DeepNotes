import type { DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";
import type { WorkerSessionBindings } from "./session-env.js";

export type Bindings = WorkerSessionBindings & {
  /** Wired in `wrangler.toml`; optional in unit tests that do not pass `env`. */
  HYPERDRIVE?: Hyperdrive;
  /** Durable Object namespace for live page collab (optional in Vitest). */
  PAGE_COLLAB_ROOM?: DurableObjectNamespace;
  /** Same-worker service binding for DO → HTTP internal append. */
  WORKER_SELF?: Fetcher;
  /** Shared secret for `/api/internal/.../collab-ws-append` (Wrangler secret / `.dev.vars`). */
  COLLAB_INTERNAL_SECRET?: string;
  /** Per-user realtime fan-out (legacy `USER_NOTIFICATION`). */
  USER_REALTIME_ROOM?: DurableObjectNamespace;
  /** Shared secret for USER_REALTIME_ROOM internal push (Wrangler secret / `.dev.vars`). */
  REALTIME_INTERNAL_SECRET?: string;
};
