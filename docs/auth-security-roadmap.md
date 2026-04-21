# Auth Security Roadmap

Working notes for the auth canvas. Current state reflects what's actually
implemented in this repo today; each "Not yet" item includes enough detail to
make a call without rereading the whole conversation.

---

## Current state (implemented)

- **httpOnly cookies** — `auth_token` (15 min), `refresh_token` (90 d),
  `device_secret` (90 d). `sameSite=lax`, `secure=!isDev`, `path=/`.
- **bcrypt + base64-wrapped password hashes** (`HashService`).
- **Per-device trust** — `user_devices` row keyed on `(user_id, device_id)` with
  a hashed `device_secret`; the JWT guard verifies
  `sha256(device_secret) === device_secret_hash` on every request.
- **Fingerprint capture** — UA / platform / device_class / OS / language /
  encoding / accept / JA3 hashed into `fingerprint_hash`. **Stored but not
  enforced** — the strict/balanced comparison block is intentionally commented
  out (too much UX risk from browser updates shifting the fingerprint).
- **2FA email code for new-device registration** — gated by
  `users.twofa_enabled`; currently always `false` so the branch is dormant.
  `EmailService` is a webhook shim that logs the code when no webhook is
  configured.
- **Refresh token rotation + reuse detection** — `user_sessions` table keyed on
  `(user_id, device_id)` tracks `current_jti` / `previous_jti`. Every refresh
  rotates the JTI atomically; a presented JTI that matches neither current nor
  (within a 5 s grace window) previous triggers revocation of **all** sessions
  for the user.
- **Frontend auth state** via TanStack Query (`useAuth`) hitting `/auth/check`
  as source of truth; localStorage flag kept only as optimistic first-paint
  hint.

---

## Priority 1 — short-term wins (low effort, high value)

### ✅ Refresh token rotation + reuse detection — **DONE**

See `src/auth/sessions.service.ts` and the refresh branch of
`src/auth/guards/jwt-auth.guard.ts`. The `user_sessions` schema lives in
`src/drizzle/schema.ts`; the migration is
`drizzle/migrations/0002_user_sessions_rotation.sql`.

**Known follow-ups** when this goes to production:
- Cache invalidation hook — on rotation, bust any cached session read so
  stale-cached JTIs can't pass. In ricochet this is
  `cacheService.deleteSpecificCache('session', [userId])` after the update.
- Cleanup cron — `DELETE FROM user_sessions WHERE revoked_at < now() -
  interval '7 days' OR expires_at < now()`. Keep a short audit window.
- Alerting — the `token_reuse_detected` code path already persists to
  `auth_events`; add a query/alert on that.

### ✅ Rate limiting — **DONE**

`@nestjs/throttler` registered globally in `app.module.ts` with a generous
default (120 req/min per IP). `/auth/login` and `/auth/verify-device` are
capped at 5/min; `/auth/register` at 3/min via `@Throttle` decorators in the
controller.

**Still open** — progressive lockout. Current throttler keys by IP only, so an
attacker rotating IPs is uncapped per account. Needs an `auth_attempts` table
keyed by `(user_id_or_email, ip)` with a sliding-window counter. Tiered
policy:
- 5 failures / 1 min → 60 s wait.
- 10 failures / 10 min → 10 min wait + email the user.
- 20 failures / 1 h → lock the account, require password reset.

### ✅ `auth_events` append-only audit log — **DONE**

See `src/auth/auth-events.service.ts`. Plain (non-partitioned) table in
`src/drizzle/schema.ts`; migration `drizzle/migrations/0003_auth_events.sql`.
Indexed on `(user_id, created_at)` and `(event_type, created_at)` for the two
common query shapes. Writes are fire-and-forget — a failed audit log never
breaks the auth flow.

Events currently emitted:
- `login_success`, `login_failure`, `login_new_device_challenge`
- `device_verified`
- `register`
- `logout`
- `session_revoked` (per-device), `session_revoked_all`
- `token_reuse_detected`

**Known follow-ups** when traffic grows:
- Partitioning — schema was designed to be partition-friendly (monotonically
  increasing `id` + `created_at`). When volume warrants, re-create as
  `PARTITION BY RANGE (created_at)` and rotate monthly partitions with
  `DROP PARTITION` past retention.
- Retention — add a cron `DELETE FROM auth_events WHERE created_at < now() -
  interval '6 months'` (or whatever compliance dictates).
- Anomaly queries — e.g. "more than 10 `login_failure` events for one user in
  the last 5 minutes" → page on-call. This is the seed data for risk-based
  auth (P3).

### ⬜ HIBP breach check on signup — ~30 min

Hash the password with SHA-1 (yes, SHA-1 — this is the HIBP API contract, not
for storage), send the first 5 hex chars to
`https://api.pwnedpasswords.com/range/{prefix}`, scan the response for the
remaining 35 chars. If present, reject registration / password change with a
"this password appears in known breaches" error.

No API key required. Free, unlimited, anonymous (the prefix-only lookup is
k-anonymous). Takes ~100 ms of latency on the signup path.

### ✅ Login notification emails — **DONE**

`EmailService.sendLoginNotification({ to, ip, userAgent, at })` fires from
`AuthService.login` and `AuthService.consumeLoginCode` on every successful
login. Body includes timestamp, IP (respects `X-Forwarded-For`), and UA. Still
flows through the webhook shim — when `EMAIL_WEBHOOK_URL` is unset, the
intended recipient and subject are logged.

**Still open:**
- Plug a real email provider into `EMAIL_WEBHOOK_URL` (Postmark / Resend) when
  the canvas goes to prod.
- Add a "wasn't you?" link that hits `POST /auth/sessions/revoke-all` (endpoint
  doesn't exist yet — see P2 sessions UI).
- HTML template — current body is plain text.

---

## Priority 2 — meaningful uplift (medium effort, some design)

### ⬜ TOTP MFA — ~half day

RFC 6238 authenticator-app flow. `users.twofa_enabled` already exists — just
not populated. Libraries: `otplib` + `qrcode` for enrollment.

**Design decisions:**
- Backup codes — how many (typically 8 or 10), single-use, how they're
  stored (bcrypt of each, like passwords).
- Recovery flow — email + backup code, or email + identity verification?
- Can users *disable* TOTP? (Yes, after re-auth with password + current TOTP.)
- Enrollment UI — QR code scan + confirm with a valid 6-digit code before
  flipping `twofa_enabled=true`.

Once shipped, the existing "new device needs email code" flow becomes a
fallback for users with TOTP disabled.

### ⬜ Step-up re-auth for sensitive ops — ~2–3 h

Mint a short-lived `sensitive_op_token` (5 min, signed, claim `op: 'sensitive'`)
after the user re-enters their password. Sensitive endpoints require this
token in an `X-Step-Up` header in addition to normal auth. Matches the pattern
Stripe / GitHub / AWS use.

Apply to: password change, email change, TOTP enable/disable, device revoke,
account deletion.

### ⬜ Sessions / devices management UI — ~half day

Expose `user_devices` + `user_sessions` to the user as "Active sessions".
Columns: device name/UA/last-used/trusted-status + a revoke button that kills
the (device_id, user_id) pair. Useful both as security feature and as a
debugging handle when users report weird behavior.

Endpoints:
- `GET /auth/sessions` — list.
- `DELETE /auth/sessions/:deviceId` — revoke (calls
  `SessionsService.revokeByDevice` + invalidates `user_devices.authenticated`).

### ⬜ Asymmetric JWT signing + `kid` header — ~2 h code + design

Swap HS256 (single shared secret) for RS256 or EdDSA (keypair). `kid` header
points to which public key to verify with. Benefits:
- Only the auth service needs the private key; any other service can verify
  with the public key.
- Rotation is incremental — publish a new `kid`, sign new tokens with new key,
  old tokens verify against old key until they expire. No fleetwide re-login.

Requires a key management decision up front — where the private key lives
(Vault / KMS / env var with lifecycle policy), how public keys are
distributed (JWKS endpoint?), rotation cadence.

### ⬜ Email verification on signup — ~half day

Send a one-time link (JWT-signed or table-row token) to the submitted email;
mark `users.email_verified = true` only after they click. Block sensitive
operations until verified. Same email infrastructure as login notifications.

---

## Priority 3 — longer-term (real effort, or product decisions)

### ⬜ WebAuthn / passkeys

Gold-standard device binding — the private key lives in the secure element /
TPM / Secure Enclave and never leaves. Cookie theft stops mattering for
passkey-only accounts. `@simplewebauthn/server` + `@simplewebauthn/browser`
handle the protocol, but the hard part is **recovery flows**:

- What happens when a user's only passkey is lost?
- Do you allow fallback to password + email code, or require recovery codes?
- Multi-passkey per account (phone + laptop + hardware key) becomes table
  stakes.

Worth doing when the product can tolerate the support burden. Not before.

### ⬜ Risk-based / adaptive auth

Anomaly detection on login: new country / ASN / impossible travel / UA class
switch → step-up challenge. Genuinely expensive — needs:

- Geo-IP database (MaxMind free tier or paid).
- Per-user session history queries.
- Rule engine or ML scoring model.
- Ops tuning to avoid false-positive misery.

This is what Auth0 / Okta charge premium per-seat for. Only build it if you
have actual user data and a real fraud/ATO risk.

### ⬜ Password reset flow

Scoped out originally; not hard (similar to email verification). Move to P2 if
you want it before shipping anything real — users do lock themselves out.

Endpoints ricochet already has (for reference):
- `POST /auth/reset_password/request` — email a code.
- `POST /auth/reset_password/callback` — exchange code for a reset JWT.
- `POST /auth/reset_password/change` — exchange reset JWT + new password.

---

## Cross-cutting design decisions to revisit before production

### Cache layer

DM-Tool-box currently hits Postgres on every authed request (the
`user_devices` lookup in the guard). At ricochet scale that's a 30-min Redis
cache with invalidation hooks on mutation. Before this canvas becomes a real
prod system:

- Decide on cache backend (Redis / Memcached / in-process LRU).
- Wire invalidation: `SessionsService.rotate`, `revokeByDevice`, `revokeAll`
  and `AuthService.login` / `consumeLoginCode` all need to bust the cache
  entry for the affected `(user_id)` or `(user_id, device_id)`.
- Cache key shape — ricochet uses `['session', userId]` namespaces; something
  similar is fine.

### Refresh rotation race window

The guard allows a 5-second grace where a presented `previous_jti` is treated
as "this is the in-flight concurrent refresher, let it through without
re-rotating." Chosen as a balance between:

- Too short → legitimate concurrent requests from a multi-tab client 401.
- Too long → an attacker has a 5 s window to replay a stolen-but-just-rotated
  token.

Revisit if you add heavy SSE / WebSocket + XHR concurrency that pushes the
race window.

### Fingerprint enforcement posture

Currently **stored but not enforced**. Three options for production:

1. **Leave as-is.** Fingerprint is an audit/forensics field only. Cheapest,
   zero UX risk, questionable security value.
2. **Enforce at "strict" threshold only.** `strict++` means UA-major,
   platform, device_class, or os_family changed. Rejects obvious
   machine-to-machine replay. UX cost: Chrome major-version bumps
   force a re-login for everyone on update day.
3. **Drop the column.** If enforcement is never going to happen, remove it
   rather than carrying dead metadata.

### JWT secret rotation

`JWT_SECRET` is currently a single HS256 secret. Rotating it signs everyone
out. See P2 "Asymmetric JWT signing" — do that before you care about
rotation.

### Logout semantics

`logout` now revokes the `user_sessions` row for the current device — the
refresh token becomes useless from that point. `auth_token` remains valid
until its 15-min expiry even after logout, because JWTs are stateless. If you
need instant-invalidate, the options are:

- Keep a tiny `revoked_jtis` set in Redis with TTL = remaining token life.
- Put an `active_session_id` on the auth_token and check it in the guard
  (adds the per-request read you were trying to avoid — use cache).

For DM-Tool-box / canvas level, 15 min of residual access after logout is
acceptable.

---

## Effort summary

| Tier | Scope | Rough effort |
| --- | --- | --- |
| P1 remaining | HIBP breach check, progressive lockout | ~1 h |
| P2 | TOTP, step-up, sessions UI, RS256, email verify | 2–3 days |
| P3 | Passkeys, risk-based, password reset | weeks, or as needed |

Priority ordering is by return-on-implementation-effort assuming cookie-based
session auth is the chosen foundation. If the product moves toward passwordless
(magic links, passkeys first), the sequence changes.
