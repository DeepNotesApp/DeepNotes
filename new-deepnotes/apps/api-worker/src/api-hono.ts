import type { Hono } from "hono";
import type { Bindings } from "./bindings.js";

/** Shared Hono typing for api-worker route modules. */
export type ApiHono = Hono<{ Bindings: Bindings }>;
