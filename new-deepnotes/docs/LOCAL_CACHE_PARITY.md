# Legacy local-cache vs greenfield realtime

The legacy app’s `@stdlib/data` **DataAbstraction** combined Redis (KeyDB), an **in-process LRU** (“local cache”), and **in-process pub/sub** so that co-located subscribers saw hash updates without a Redis round-trip.

## Greenfield mapping

| Legacy behavior | New stack |
|-----------------|-----------|
| Cross-process hash visibility | **Upstash Redis** + **`EXPIRE`** on hash keys (7-day TTL; replaces KeyDB **`expiremember`**) |
| Same-instance UI subscribers | **`UserRealtimeRoom` Durable Object** WebSocket: **REQUEST** / **RESPONSE** / **DATA_NOTIFICATION** via `@deepnotes/realtime-wire` |
| Cross-instance hash writes | After **HSET**, **PUBLISH** `data-update\|{fullKey}`; DO **SSE `/subscribe`** on that channel forwards remote writes as **DATA_NOTIFICATION** (self-echo filtered) |
| `USER_NOTIFICATION` | Worker pushes framed payloads after `performNotifyUsers` (internal secret), not legacy Redis pub/sub for that path |

## Intentionally not replicated

**In-process local-cache pub/sub** (same Node isolate fan-out) has **no** first-class equivalent on Cloudflare Workers: isolates are short-lived and not a shared LRU. Clients already rely on **WebSocket** for prompt UI updates; the DO + Redis bridge matches cross-tab/window coherence **without** shipping legacy DataAbstraction.

If a future **Node**-hosted edge ever reintroduces a process-local layer, document how it composes with the same Redis key naming (`user:{id}`, `page:{id}`, `group:{id}`) and **`data-update\|{fullKey}`** channels so behavior stays aligned.
