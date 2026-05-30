# Collab Durable Object Architecture

> **Status:** Documented  
> **Date:** 2026-05-30

## What `PageCollabRoom` does today

`PageCollabRoom` is a Cloudflare Durable Object instantiated once per `pageId` (via `idFromName(pageId)`). It is a **stateless relay**:

1. Accepts WebSocket upgrades from clients.
2. Deserializes `userId` from the upgrade request header.
3. On each binary message:
   - **Awareness** → broadcast to all other sockets immediately.
   - **DOC** / **PAGE_DOC** → `POST` the encrypted update to the Worker (`/api/internal/pages/:pageId/collab-ws-append`), which persists it to Postgres `page_updates`.
   - On successful persist response (returns `newIndex`), broadcast the update to peers and ACK the sender.

## Why stateless?

Legacy `collab-server` held a full Yjs `Doc` in memory, merged updates server-side, and streamed the complete document history on connect.

The new DO **does not** hold a Yjs doc in memory. Reasons:

1. **Hibernation safety.** Cloudflare DOs hibernate after inactivity. A stateful doc would need complex reconnect/re-hydrate logic.
2. **Simplicity.** The DO only relays opaque blobs; the Worker handles auth, encryption, and persistence.
3. **Horizontal scaling.** Multiple DO instances (or Workers) never need to sync Yjs state with each other.

## Trade-offs

| Aspect | Stateful (legacy) | Stateless relay (new) |
|--------|---------------------|-----------------------|
| Server memory | High (Yjs Doc per page) | Zero |
| Reconnect speed | Fast (doc served from memory) | Slower (client REST-bootstraps from Postgres) |
| Validation | Possible (server can inspect Yjs structure) | Impossible (opaque encrypted blobs) |
| Page size limits | Enforceable at merge time | Must be enforced by client or periodic audit |
| Duplicate push | Prevented by server merge | Prevented by client `serverDoc` diff + ACK |
| CPU under load | Merge + broadcast per edit | Broadcast only; Worker does DB write |

## Protocol differences vs legacy

| Feature | Legacy | New |
|---------|--------|-----|
| Bootstrap | `ALL_UPDATES_UNMERGED` over WS on connect | `GET /api/pages/:pageId/collab-updates` REST (paginated) |
| ACK semantics | Server merges into doc, ACKs updateId | Worker persists to Postgres, ACKs with `dbIndex` |
| Unacked retry | Client `_unackedUpdates` Map, auto-resend on reconnect | Client `unackedUpdates` Map (Phase 3 deliverable) |
| Message types | `DOC`, `AWARENESS` | `DOC`, `AWARENESS`, `PAGE_DOC` (spatial) |

## PAGE_DOC extension

Starting Phase 3, the collab wire supports `PAGE_DOC` (message type `2`) for page-level Yjs updates (note positions, arrow creation, container nesting, etc.).

- **Client → DO:** `encodePageDocSingleUpdateFromClient({ updateId, encryptedUpdate })`
- **DO → peers:** `encodePageDocSingleUpdateFromServer(encryptedUpdate, dbIndex)`
- **DO → sender:** `encodePageDocSingleUpdateAck({ updateId, dbIndex })`

The DO handler is identical to `DOC` except it uses the `PAGE_DOC` message type for relay and ACK. Persistence is still via the same Worker internal endpoint.

## CPU limits and backpressure

The DO calls `this.broadcast()` synchronously for every connected socket. Under high load:

- **Current:** No explicit throttling. With 50+ concurrent editors and rapid edits, DO CPU could approach Cloudflare limits.
- **Mitigation:** The DO is stateless and hibernates, so CPU is only consumed while messages are active. If limits are hit, options include:
  1. Batch broadcasts (queue updates and flush every 50 ms).
  2. Shard `PageCollabRoom` by `pageId` prefix (multiple DO namespaces).
  3. Move to a stateful DO that validates and drops no-op updates before broadcast.

**Recommendation:** Monitor DO CPU in staging (Phase 9). Do not pre-optimize until metrics show a problem.

## Max concurrent editors

Soft recommendation: **200 concurrent WebSocket connections per page**. Beyond this, test broadcast latency. If p95 > 200 ms, consider sharding or batching.
