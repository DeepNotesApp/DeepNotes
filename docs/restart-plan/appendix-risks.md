# Appendix: Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Test infrastructure stays broken** | High if not prioritized | Blocks all other work | **Phase 0 is mandatory and comes first.** No feature work until tests pass. |
| **Spatial canvas underestimated** | Already happened | 6+ weeks slip | Acknowledged in spatial gap analysis. Do not allow agents to mark stubs as "done." Use checklist in Phase 1. |
| **SyncedStore / Yjs reactivity issues** | Medium | Blocks Phase 5 | Make architecture decision before coding. Spike 1 day to test SyncedStore with Vite 6 + Vue 3.5. |
| **Collab protocol mismatch** | Medium | Data corruption | Version the collab protocol (`v1` = ProseMirror-only, `v2` = page-level). Reject unknown message types gracefully. |
| **Performance: many notes on one page** | Medium | Laggy canvas | Set a soft limit (e.g., 200 notes) and benchmark. Use virtual rendering or canvas-based rendering if DOM scales poorly. |
| **Stripe-only after dropping RevenueCat** | Low | User churn | Communicate to IAP users before cutover. Offer migration grace period. |
| **Worker CPU limits under collab load** | Medium | Dropped connections | Load test early (Phase 9 staging). If DO CPU is the bottleneck, shard `PageCollabRoom` by page ID prefix. |
| **God-object state returns** | Medium | Unmaintainable code | Cap composable size at 300 lines. If `useSpatialViewport.ts` grows beyond that, split into `useCamera`, `usePanning`, `useZooming`. |
| **`page_updates` format migration** | Medium | Data corruption or unreadable legacy pages | Decide Option A/B in Phase 3 before any spatial collab code. Test decrypt of 100 random legacy pages after migration. |
| **`page_updates` row explosion (no squashing)** | **High** | Table bloat, slow bootstrap, expensive storage | Implement buffering/squashing in Phase 3. Monitor `page_updates` row count per page in staging load test. Alert if > 1000 new rows/hour. Block cutover if exceeded. |
| **Stale auth sessions in collab DO** | Medium | Revoked users continue editing; security gap | Implement per-message `checkStillAllowed` with 30s TTL cache in Phase 3. Unit test revocation mid-session. |
| **DO broadcast backpressure under load** | Medium | Dropped connections, CPU limit exceeded | Chunk broadcast into batches of ≤ 10 sockets in Phase 3. Document max editors per page. Load test in Phase 9. |
| **Realtime SSE bridge missed updates** | Medium | Cross-isolate subscribers see stale data for 1–3s | Add sequence numbers to `DATA_NOTIFICATION` or switch to Redis pub/sub. Document in `docs/REALTIME_BRIDGE_ARCHITECTURE.md`. |
| **DO hibernation drops WS state** | Medium | Users see collab reconnects | `PageCollabRoom` is stateless relay, so hibernation is safe. Document in `docs/COLLAB_DO_ARCHITECTURE.md`. If stateful DO chosen later, implement reconnect protocol. |
| **i18n / SSR regressions** | Low | Accessibility, SEO, share-ability loss | Document as accepted v2 regressions or schedule recovery in `adr-005-ssr-i18n-scope.md`. |
| **Group password not implemented** | Low | Users cannot access password-protected groups in new app | Add to Phase 7. If deferred, document v2 scope. |
| **No scheduler = soft-deleted data accumulates** | Medium | DB bloat | Add Cron Trigger or Queue cleanup to Phase 7/9. |
| **Collab protocol narrower than legacy** | Medium | Slower reconnects, lost ACK edge cases | Document in `docs/COLLAB_PROTOCOL_PARITY.md`. Monitor unacked-update metrics. |
| **`@deepnotes/session` god package** | Medium | Cross-domain coupling, slow test feedback | Split into `@deepnotes/billing`, `@deepnotes/collab`, `@deepnotes/realtime` in Phase 7. Enforce with ESLint. |
| **Route boilerplate accumulation** | Medium | Inconsistent error handling, copy-paste bugs, inflated bundle | Refactor into Hono middleware in Phase 4. ESLint rule to prevent inline repetition. |
| **`page_updates` no pagination** | Medium | OOM on large page bootstrap | Fixed in Phase 0 with `?sinceIndex=`. Monitor max response size in production. |
| **Routing divergence (page vs spatial)** | Medium | User confusion, broken bookmarks | Decide in Phase 4. Communicate clearly if URLs change. |
| **No Playwright = no E2E gate** | Medium | Regressions slip into production | Add skeleton in Phase 0; build smoke test in Phase 7. |
| **Legacy schema fields omitted in new model** | Medium | Subtle data-loss or UI bugs | Enforce Phase 1 schema diff table as a hard gate before Phase 3 coding. |
| **Marketing/help/pricing pages missing** | **High** | **No public onboarding, no SEO, no conversion, blocks launch** | Dedicated Phase 8 with Lighthouse SEO gate. Do not treat as "polish." |
| **ADR deadlines missed** | Medium | Agents code against unmade decisions; rework | ADR gates: no coding on affected deliverables until ADR is `accepted`. |
