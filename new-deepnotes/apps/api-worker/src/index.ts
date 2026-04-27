import { getOpenApiDocument, healthResponseSchema } from "@deepnotes/api";
import { Hono } from "hono";

type Bindings = {
  /** Wired in `wrangler.toml`; optional in unit tests that do not pass `env`. */
  HYPERDRIVE?: Hyperdrive;
};

const app = new Hono<{ Bindings: Bindings }>();

const sessionNotImplementedBody = {
  code: "NOT_IMPLEMENTED" as const,
  message:
    "Session handlers are not wired yet (crypto, Redis, Drizzle). See OpenAPI for the contract.",
};

app.get("/api/openapi.json", (c) => c.json(getOpenApiDocument()));

app.get("/api/health", (c) => {
  const body = { status: "ok" as const, service: "deepnotes-api-worker" };
  const parsed = healthResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ status: "error" }, 500);
  }
  return c.json(parsed.data);
});

app.post("/api/sessions/login", (c) =>
  c.json(sessionNotImplementedBody, 501),
);
app.post("/api/sessions/refresh", (c) =>
  c.json(sessionNotImplementedBody, 501),
);
app.post("/api/sessions/logout", (c) =>
  c.json(sessionNotImplementedBody, 501),
);
app.post("/api/sessions/demo", (c) => c.json(sessionNotImplementedBody, 501));

export default app;
