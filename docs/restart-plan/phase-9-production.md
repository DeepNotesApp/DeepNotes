# Phase 9: Production Readiness and Cutover

> **Prerequisites:** Phase 6, Phase 7, and Phase 8 done.  
> **Status:** Not started

---

## Goal

Prepare for production cutover with observability, load testing, and a rollback plan.

---

## Deliverables

1. **Observability**
   - Replace `console.log` in `PageCollabRoom` and `UserRealtimeRoom` with structured logging (e.g., `console.log(JSON.stringify({ level, event, pageId, userId, ... }))`).
   - Add metrics: WS connection duration, DB query latency, collab push latency, realtime hash HSET latency.
   - Document monitoring dashboard queries in `docs/OBSERVABILITY.md`.

2. **Load testing**
   - Target: 50 concurrent collab pages, verify WS latency < 200 ms p95.
   - **Collab row creation rate test:** 5 users × 60 WPM × 10 minutes per page. Assert squashing keeps new `page_updates` rows ≤ 20 per page. If > 1000 rows/hour, the squashing mechanism is insufficient — block cutover.
   - **Auth revocation test:** revoke a user's group membership during active collab session; assert socket closes within 30 seconds.
   - **Broadcast backpressure test:** 50 sockets on one page; assert no `1011` closes from DO CPU limit.

3. **Rollback plan**
   - Document how to revert traffic to legacy `/trpc` stack without data loss.
   - Verify encrypted blob compatibility: random sample of 100 legacy pages decrypt correctly in new stack.
   - Feature flag: ability to disable `PageCollabRoom` WS and fall back to REST-only collab push.

4. **Mobile shells (deferred from original plan)**
   - Capacitor for iOS/Android (if product requires it).
   - Tauri v2 for desktop (if product requires it).
   - **Decision:** If product is web-first, document that mobile shells are v2 scope in `adr-004-launch-marketing-scope.md`.

5. **Data migration runbook**
   - Step-by-step to migrate existing Postgres data to new schema (if any schema changes required).
   - Encrypted blob compatibility check: random sample of 100 pages decrypted successfully.

6. **Cutover**
   - Canary redirect: 5% of traffic to new stack.
   - Monitor error rates, collab latency, Stripe webhooks.
   - Full cutover when 24-hour error rate < 0.1%.

---

## Exit criteria

- [ ] Staging load test passes (WS p95 < 200 ms, row rate ≤ 20/page, auth revocation < 30 s).
- [ ] 100 random legacy pages decrypt correctly in new stack.
- [ ] Rollback plan documented and rehearsed (team can execute revert in < 15 minutes).
- [ ] 24-hour canary error rate < 0.1%.
- [ ] Old `/trpc` stack receives zero requests for 48 hours after full cutover.
