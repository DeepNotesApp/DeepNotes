# Phase 2: Backend REST + Drizzle parity

> **Prerequisites:** Phase 0 done.  
> **Status:** Verified (mainly done)

---

## Goal

Confirm all non-spatial backend features are implemented and tested.

---

## Verification checklist

| Feature | REST route | Test file | Status |
|---------|------------|-----------|--------|
| Register | `POST /api/users` | `account-flows.integration.test.ts` | Verify green |
| Login | `POST /api/sessions/login` | `account-flows.integration.test.ts` | Verify green |
| Refresh | `POST /api/sessions/refresh` | `account-flows.integration.test.ts` | Verify green |
| Logout | `POST /api/sessions/logout` | `account-flows.integration.test.ts` | Verify green |
| 2FA enable/load/disable | `POST /api/users/me/2fa/*` | `account-flows.integration.test.ts` | Verify green |
| Page CRUD | `POST /api/groups/:gid/pages`, `DELETE /api/pages/:pid` | `account-flows.integration.test.ts` | Verify green |
| Page move/reencrypt | `POST /api/pages/:pid/move` | `account-flows.integration.test.ts` | Verify green |
| Snapshots | `GET/POST/DELETE /api/pages/:pid/snapshots` | `account-flows.integration.test.ts` | Verify green |
| Group members/invite/join | `POST /api/groups/:gid/join-invitations/*` | `account-flows.integration.test.ts` | Verify green |
| Group privacy (public/private) | `POST /api/groups/:gid/privacy/*` | `account-flows.integration.test.ts` | Verify green |
| Group password | `POST/PATCH/DELETE /api/groups/:gid/password` | `account-flows.integration.test.ts` | Verify green |
| Billing (Stripe) | `POST /api/billing/stripe/*` | `stripe-billing.test.ts` | Verify green |
| Realtime WS (hash) | `GET /api/realtime-ws` | `realtime-ws-batch.test.ts` | Verify green |
| Collab WS (DO) | `GET /api/pages/:pid/collab-ws` | `collab-wire` unit tests | Verify green |

---

## Exit criteria

- [x] Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing test in CI.
- [x] `api-worker` 503 matrix test (`index.test.ts`) passes (all routes return 503 when env is missing).
- [x] No backend route is "stubbed" (returns 501 or empty body) for a feature claimed as done.
