# Appendix: Auth Migration Evaluation

> **Scope:** TOTP/2FA, password change, email change.  
> **Evaluated:** 2026-05-31.  
> **Verdict:** High-quality migration. Core security model preserved; architectural simplifications are improvements.

---

## 1. TOTP / Two-Factor Authentication

### Endpoint parity

| Feature | Legacy (tRPC / WebSocket) | New (REST) | Status |
|---------|---------------------------|------------|--------|
| Enable request | `users.account.twoFactorAuth.enable.request` | `POST /api/users/me/2fa/enable/request` | ✅ |
| Enable finish | `users.account.twoFactorAuth.enable.finish` | `POST /api/users/me/2fa/enable/finish` | ✅ |
| Load secret | `users.account.twoFactorAuth.load` | `POST /api/users/me/2fa/load` | ✅ |
| Regenerate recovery codes | `users.account.twoFactorAuth.generateRecoveryCodes` | `POST /api/users/me/2fa/recovery-codes` | ✅ |
| Forget trusted devices | `users.account.twoFactorAuth.forgetTrustedDevices` | `POST /api/users/me/2fa/devices/forget` | ✅ |
| Disable | `users.account.twoFactorAuth.disable` | `POST /api/users/me/2fa/disable` | ✅ |
| Login enforcement | `sessions.login` → `_checkTwoFactorAuth` | `POST /api/sessions/login` → `assertTwoFactorOk` | ✅ |

### What is identical

- `otplib`/`authenticator` for token verification.
- Recovery codes generated as `sodium.to_hex(sodium.randombytes_buf(16))` (6 codes).
- Recovery codes hashed before encryption; verified by hash comparison.
- Authenticator secret and recovery codes encrypted with env keys.
- `devices.trusted = true` set on login when `rememberDevice` is passed and token is valid.
- Failed-login rate-limiting (Redis counters, 4-attempt threshold, 15-min TTL) incremented on bad TOTP or bad recovery code.

### What improved

- **New code explicitly throws `SERVER_MISCONFIG`** when `twoFactorAuthEnabled` is true but `encryptedAuthenticatorSecret` is null. Legacy would likely crash with a less specific error.

### Identified gaps

1. **`rememberDevice` UI missing in login**  
   `LoginView.vue` has `authenticatorToken` and `recoveryCode` fields but no `rememberDevice` checkbox. The API schema supports it (`sessionLoginRequestSchema`), but `useSession.ts` never sends it. **Impact:** users prompted for 2FA on every login from the same browser. **Severity:** low UX regression.

2. **No distributed locking**  
   Legacy wrapped 2FA mutations in a Redlock (`user-lock:${userId}`). New code relies on Postgres row-level locking via Drizzle transactions. For single-row user updates this is sufficient, but concurrent password-change + email-change requests could race across instances. **Severity:** low-medium.

---

## 2. Password Change

### Legacy design
Two-step WebSocket handshake (`/trpc/users.account.changePassword`):
1. Client sends `oldLoginHash`; server verifies, unwraps keyrings, returns raw keyrings.
2. Client re-wraps with new password, sends `newLoginHash` + re-wrapped keyrings; server stores and invalidates sessions.

### New design
Single HTTP call (`POST /api/users/me/password`):
- Client (`build-password-and-email-confirm.ts`) re-wraps keyrings **locally**.
- Server verifies old password, stores new PHC and already-re-wrapped keyrings, invalidates all sessions, and returns `Set-Cookie` headers to clear tokens.

### Assessment

- **This is a clear improvement.** Moving unwrap/rewrap to the client eliminates a round-trip, removes a WebSocket endpoint, and reduces server attack surface (server never decrypts and transmits raw keyrings).
- Session invalidation preserved: all user sessions marked `invalidated = true` in a transaction.
- Cookie clearing added: `accessToken`/`refreshToken`/`loggedIn` cleared, forcing re-login with new password.
- Integration tests verify new PHC matches, keyrings unwrap with new password, and sessions invalidated.

---

## 3. Email Change

### Legacy design
- **Request:** `users.account.emailChange.request` — verifies password, checks uniqueness, stores `encrypted_new_email` + code, sends email.
- **Finish:** Two-step WebSocket at `/trpc/users.account.emailChange.finish` — server unwraps keyrings in step 1, client re-wraps in step 2.

### New design
- **Request:** `POST /api/users/me/email-change` — same checks; returns 6-digit code in dev when `SEND_EMAILS=false`.
- **Confirm:** `POST /api/users/me/email-change/confirm` — **single call**. Client sends already-re-wrapped keyrings. Server verifies code and password, decrypts pending email, updates row, invalidates sessions, clears cookies, optionally updates Stripe customer.

### Assessment

- Same structural improvement as password change: single call, client-side unwrap/rewrap.
- Stripe customer update preserved and wrapped in `try/catch` (non-fatal), matching legacy.
- Pending-state clearing correct: `encrypted_new_email` and `email_verification_code` nulled.
- Email normalization preserved (lower-case with exceptions list).
- Integration tests cover request → confirm round-trip, wrong password rejection, and wrong code rejection.

---

## 4. Login 2FA Enforcement

| Aspect | Legacy | New | Assessment |
|--------|--------|-----|------------|
| User lookup | Knex `where('email_hash', ...)` | Drizzle `eq(users.emailHash, ...)` | Equivalent |
| Password check | `sodium.memcmp` | `sodium.memcmp` | Identical |
| Device trust | `getUserDevice` → `device.trusted` | `getDeviceHash` + `devices` table | Identical behavior |
| 2FA enforcement | `_checkTwoFactorAuth` | `assertTwoFactorOk` | 1:1 logic |
| Recovery code consumption | `splice(i, 1)` + re-encrypt | Same pattern | Identical |
| Session generation | `generateSessionValues` | `createSessionRowAndCookies` | Equivalent |
| Keyrings returned | Unwrapped with `passwordValues.key` | Same | Identical |

---

## 5. Testing Coverage

| Scenario | New integration test coverage |
|----------|------------------------------|
| Email change request → confirm | ✅ |
| Email change rejects wrong password | ✅ |
| Email change confirm rejects wrong code | ✅ |
| Password change updates PHC + keyrings | ✅ |
| Password change invalidates all sessions | ✅ |
| Password change rejects wrong old password | ✅ |
| Password change rejects demo user | ✅ |
| 2FA login succeeds with valid TOTP | ✅ |
| 2FA login rejects missing TOTP | ✅ |
| 2FA login rejects invalid TOTP | ✅ |
| 2FA login succeeds with recovery code | ✅ |
| Recovery code cannot be reused | ✅ |

---

## 6. Summary of gaps & risks

| Issue | Severity | Details | Suggested action |
|-------|----------|---------|----------------|
| Missing `rememberDevice` UI in login | Low | Schema supports it; client never sends it | Add checkbox to `LoginView.vue` and wire through `useSession.ts` |
| No distributed locking for account mutations | Low–Medium | Legacy Redlock removed; DB transactions only | Document as accepted, or add advisory lock if multi-instance race is a concern |
| No `dataAbstraction` caching layer | Low | Legacy had Redis-backed cache; new hits Postgres directly | Negligible for account mutations; monitor if needed |
| WebSocket → HTTP transport change | None (improvement) | Intentional and correct | No action |

---

*End of appendix*
