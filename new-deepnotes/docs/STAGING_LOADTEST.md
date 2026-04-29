# Staging load test and smoke (Cloudflare §8)

Supports [RESTART_PLAN §8](../../docs/RESTART_PLAN.md) success criteria: prove **Hyperdrive**, **Postgres**, **Redis**, and **collab + realtime WebSockets** in an environment that matches production topology before cutover.

---

## Environment checklist

- [ ] **Workers** deployed to staging; **routes** match prod (API + static asset origin story documented).
- [ ] **Hyperdrive** binding points at staging **Postgres** (pooled); app creates a client per request—no long-lived Node pools on Workers.
- [ ] **Postgres** reachable from Workers via Hyperdrive; migrations applied; smoke query or `/api/health` + one authenticated read OK.
- [ ] **Redis** (e.g. **Upstash**) credentials in Wrangler secrets; **`UPSTASH_REDIS_*`** / TCP URL as implemented—verify hash **`user:`** / **`page:`** / **`group:`** paths when Hyperdrive + Redis both configured ([LOCAL_CACHE_PARITY.md](./LOCAL_CACHE_PARITY.md) stance).

---

## WebSocket smoke (manual or scripted)

- [ ] **Collab:** upgrade to `PageCollabRoom`, append a small Yjs update, confirm second client receives framed traffic ([collab wire](../packages/collab-wire)).
- [ ] **Realtime:** upgrade to **`GET /api/realtime-ws`**, **`UserRealtimeRoom`** accepts session; exercise **`USER_NOTIFICATION`** or hash **REQUEST**/**SUBSCRIBE** slice used by the SPA ([realtime wire](../packages/realtime-wire)).

---

## What to measure

| Signal | Why |
|--------|-----|
| **HTTP p95 latency** (warm routes) | Hyperdrive + Worker CPU vs cold isolate |
| **5xx / upgrade failure rate** | Routing, auth cookie, origin mismatches |
| **WS disconnect / reconnect counts** | Client churn; DO hibernation behavior |
| **Collab append latency** | DO + Postgres append path under concurrent editors |
| **Realtime fan-out / Redis publish lag** | Cross-process hash notifications |
| **Cloudflare billing counters** (DO requests, Worker invocations, Hyperdrive queries) | Cost model vs SLO |

Keep the first run **qualitative smoke + light concurrency**; ramp load only after smoke passes. Record dates and outcomes in [PLAN_PROGRESS.md](../PLAN_PROGRESS.md) log.
