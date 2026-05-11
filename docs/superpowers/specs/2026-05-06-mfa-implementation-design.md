# IAM-03 — MFA for Privileged Roles (Design Spec)

**Status:** Approved 2026-05-06 · awaiting implementation plan
**Owner:** Ashish (IAM module)
**Branch:** `Auth_Ashish` (will integrate to `Development` after green smoke run)
**PRD:** `docs/EduLearn-PRD-v1.0_2.docx` — IAM-03

---

## 1. Goal & scope

Add TOTP-based multi-factor authentication, mandatory for the five privileged roles, optional-by-design (i.e., not applied) for Student and Instructor.

**In scope (v1):**
- TOTP per RFC 6238 (HMAC-SHA1, 30-second window, 6-digit code), enforced for Registrar, DeptAdmin, Finance, ITAdmin, Auditor.
- Two new public endpoints — `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/verify`.
- One admin endpoint — `POST /api/users/{id}/mfa/reset` (ITAdmin only; safety valve for lost devices).
- `POST /api/auth/login` becomes role-aware: privileged login returns a short-lived purpose-scoped token instead of a full session JWT.
- Seeded `admin` user is pre-enrolled with a fixed test TOTP secret so smoke tests can compute valid codes.
- New audit events: `MFAEnrolled`, `MFAVerifySuccess`, `MFAVerifyFailed`, `MFAReset`.
- Notification on admin reset (in-app, via existing `NotificationService`).
- Login response gets a human-readable `Message` field telling the client what to do next.

**Out of scope (deferred / not in PRD):**
- Recovery / backup codes
- SMS or email OTP fallback
- Hardware keys, FIDO2, WebAuthn
- "Remember this device" cookies
- Per-user TOTP failure lockout (audit log captures attempts; lockout is new state we don't need yet)
- Server-side QR PNG generation (we return the standard `otpauth://` URI; the client renders the QR)
- Bulk-import / management UI for MFA state (frontend concern)
- Email notifications (NHT-02, not built yet)

---

## 2. Schema change

One nullable column on `Users`:

| Column | Type | Null | Notes |
|---|---|---|---|
| `MFASecret` | `NVARCHAR(128)` | yes | Base32-encoded shared secret. `NULL` = never enrolled. |

`MFAEnabled BIT` already exists from `InitialCreate` and stays unchanged. `MFASecret` is set during `/mfa/setup` but `MFAEnabled` only flips to `true` after the first successful `/mfa/verify`. This means an interrupted enrollment leaves the user in a clean unenrolled state — calling `/setup` again simply rotates the secret.

**Why one column, not a separate table:** one user has exactly one TOTP secret; no multi-device, no history, no expiry. A side table is unjustified.

---

## 3. Migration approach

The team's standard flow is `add-migrations.bat` (scaffold) → `migrate-database.bat` (apply). Per direction, we skip the scaffolding step but keep the apply step working unchanged.

- **Hand-write** a new migration file `EduLearn.API/Migrations/<timestamp>_AddMfaSecret.cs` mirroring the structure of `20260505053154_AddPlagiarismReports.cs`.
- `Up()` calls `migrationBuilder.Sql("ALTER TABLE Users ADD MFASecret NVARCHAR(128) NULL")`.
- `Down()` calls `migrationBuilder.Sql("ALTER TABLE Users DROP COLUMN MFASecret")`.
- **Hand-edit** `AppDbContextModelSnapshot.cs` to add the `MFASecret` property line under the `Users` builder, mirroring `MFAEnabled`'s entry.
- Teammates run `migrate-database.bat` exactly as they do today; `dotnet ef database update` picks up the new migration file.

**Why hand-edit the snapshot:** if the snapshot drifts from the model, the next person who runs `add-migrations.bat` for any reason gets a corrupt diff (EF will try to "re-add" the column). Three lines of hand-editing prevents this.

**Why not a standalone `.sql` script:** same reason — the snapshot would drift, and teammates would have to remember to run a non-standard step.

---

## 4. Library choice

**Otp.NET** (NuGet package, MIT-licensed):

```xml
<PackageReference Include="Otp.NET" Version="1.4.0" />
```

Used for: Base32 encoding/decoding, TOTP code generation, code verification with default 30-second window.

**Why:** RFC 6238 has subtle edge cases (Base32 padding, HMAC byte ordering, clock-skew tolerance). Hand-rolling is ~80 LOC; the library is ~10 LOC of usage. Saves implementation and debug time. Trusted, widely used.

---

## 5. Token model

Three JWT shapes circulate in the system:

| Token | Lifetime | `purpose` claim | What it can do |
|---|---|---|---|
| Full session | 60 min (existing) | absent | Everything the user's role allows |
| MFA pending | 5 min | `mfa_pending` | Only `POST /api/auth/mfa/setup` and `POST /api/auth/mfa/verify` |

There is **one** purpose value, not two. A pending token allows both `setup` and `verify`; the controller logic distinguishes the two cases by checking the user's current `MFAEnabled` flag (false = enrollment-flow, true = challenge-flow). This is the simplification chosen during brainstorming over a two-purpose model — saves an enum value and one branching test, no security loss because `/setup` itself rejects calls when `MFAEnabled=true` (so a leaked pending token can't overwrite an existing secret).

**Enforcement:** the JWT validator in `Program.cs` already runs on every request. We add one rule: any token carrying a `purpose` claim is rejected by the default `[Authorize]` pipeline. The two MFA endpoints accept the pending token via an inline check inside the controller (read the `purpose` claim, reject if it doesn't equal `mfa_pending`). We deliberately do **not** add a new authorization policy for this — the project already has 12 policies and adding a 13th for two callsites is bureaucratic.

---

## 6. Endpoint contracts

### `POST /api/auth/login` (existing, modified)

| Path | Status | Body |
|---|---|---|
| Wrong username/password | 401 | `{ error: "Invalid username or password" }` (existing) |
| Non-privileged role, password OK | 200 | `AuthResponseDto` (existing — full JWT) |
| Privileged role, password OK | 200 | `MfaChallengeResponseDto` (new) |

**`MfaChallengeResponseDto`** (new):
```
string  MfaToken     // 5-min JWT, purpose=mfa_pending
string  Purpose      // "mfa_pending"
int     ExpiresIn    // 300
string  Message      // human-readable hint, e.g.
                     //   MFAEnabled=false → "MFA enrollment required. POST /api/auth/mfa/setup to begin."
                     //   MFAEnabled=true  → "MFA code required. POST /api/auth/mfa/verify with your authenticator code."
```

### `POST /api/auth/mfa/setup` (new) — auth: `mfa_pending` token only

Generates a fresh Base32 secret, persists it to `user.MFASecret`. Does **not** flip `MFAEnabled`. Rejects with 409 if `MFAEnabled` is already `true` (use admin reset to rotate after enrollment).

Response: `MfaSetupResponseDto`:
```
string  Secret        // Base32 — for users who can't scan QR
string  OtpauthUri    // "otpauth://totp/EduLearn:<username>?secret=<b32>&issuer=EduLearn"
```

### `POST /api/auth/mfa/verify` (new) — auth: `mfa_pending` token only

Body: `MfaVerifyDto`:
```
string  Code  // 6-digit numeric
```

Behavior depends on the user's current `MFAEnabled`:

| Current state | On valid code | On invalid code |
|---|---|---|
| `MFAEnabled=false` (enrollment-verify) | Set `MFAEnabled=true`, audit `MFAEnrolled`, return `AuthResponseDto` (full JWT) | 401, audit `MFAVerifyFailed` |
| `MFAEnabled=true` (challenge-verify) | Audit `MFAVerifySuccess`, return `AuthResponseDto` (full JWT) | 401, audit `MFAVerifyFailed` |

If `MFASecret` is `null` when this endpoint is called (user has a pending token but never called `/setup`), return 400 `MFA_NOT_INITIALIZED`.

### `POST /api/users/{id}/mfa/reset` (new) — auth: full JWT, ITAdmin only

Clears `MFASecret` and sets `MFAEnabled=false` for the target user. Audited as `MFAReset` (with the calling admin's UserID and the target UserID). Calls `NotificationService.NotifyAsync(targetUserId, …)` to drop an in-app notification: *"Your MFA was reset by an administrator. You will be asked to enroll again on your next login."*

Response: 204 No Content. Returns 404 if user not found. Idempotent — calling against a user who has no MFA enrolled is a no-op (still returns 204). No special-case for non-privileged targets; clearing already-empty state is harmless.

---

## 7. Login flow (state machine)

```
POST /api/auth/login (username, password)
        │
        ├── password wrong  ──→ 401 (existing)
        │
        ├── status != Active ──→ 401 (existing)
        │
        ├── role ∈ {Student, Instructor}
        │       └─→ 200 AuthResponseDto (full JWT, existing flow, no change)
        │
        └── role ∈ {Registrar, DeptAdmin, Finance, ITAdmin, Auditor}
                └─→ 200 MfaChallengeResponseDto
                      mfaToken (purpose=mfa_pending, 5 min)
                      message hint (depends on MFAEnabled)

POST /api/auth/mfa/setup (mfa_pending token)
        │
        ├── MFAEnabled already true  ──→ 409 ALREADY_ENROLLED
        │
        └── generate fresh secret, store, return secret + otpauthUri
              (MFAEnabled stays false — only flips at /verify)

POST /api/auth/mfa/verify (mfa_pending token, code)
        │
        ├── MFASecret null  ──→ 400 MFA_NOT_INITIALIZED
        │
        ├── code invalid  ──→ 401, audit MFAVerifyFailed
        │
        └── code valid
              ├── MFAEnabled was false  ──→ flip true, audit MFAEnrolled
              ├── MFAEnabled was true   ──→ audit MFAVerifySuccess
              └── return AuthResponseDto (full JWT)

POST /api/users/{id}/mfa/reset (full JWT, ITAdmin)
        │
        ├── target not found  ──→ 404
        │
        └── clear MFASecret, set MFAEnabled=false
              audit MFAReset
              notify target user
              return 204
              (idempotent — no-op if already cleared)
```

---

## 8. Code organization

| File | Status | What changes |
|---|---|---|
| `Models/User.cs` | edit | Add `string? MFASecret` (MaxLength 128, nullable) |
| `Migrations/<ts>_AddMfaSecret.cs` | new | Hand-written, raw SQL via `migrationBuilder.Sql` |
| `Migrations/AppDbContextModelSnapshot.cs` | edit | Add `MFASecret` property line in `Users` builder |
| `EduLearn.API.csproj` | edit | Add `Otp.NET` package reference |
| `Services/MfaService.cs` | new | `GenerateSecret()`, `BuildOtpauthUri(user, secret)`, `VerifyCode(secret, code)`. Pure functions, no DB. |
| `Services/TokenService.cs` | edit | New method `GenerateMfaPendingToken(user)` — 5-min JWT with `purpose=mfa_pending` claim |
| `Services/AuthService.cs` | edit | `LoginAsync` branches on role; new `SetupMfaAsync`, `VerifyMfaAsync` methods |
| `Controllers/AuthController.cs` | edit | Add `[HttpPost("mfa/setup")]`, `[HttpPost("mfa/verify")]`. Both check `purpose=mfa_pending` claim inline. |
| `Controllers/UsersController.cs` | edit | Add `[HttpPost("{id}/mfa/reset")]` — ITAdmin only |
| `DTOs/AuthDto.cs` | edit | Add `MfaChallengeResponseDto`, `MfaSetupResponseDto`, `MfaVerifyDto` |
| `Program.cs` | edit | Register `MfaService` (Scoped). Update JWT validator: reject any token with a `purpose` claim from the default pipeline (so `mfa_pending` cannot reach normal endpoints) |
| `Data/DbInitializer.cs` | edit | Pre-enroll seeded `admin` with a fixed test secret + `MFAEnabled=true` |

**Sweetspot decisions captured here (deliberately not done):**
- No new authorization policy for MFA-pending tokens — inline check in two controllers
- No separate `MfaController` — the two new auth endpoints fit naturally under the existing `AuthController`; reset goes under `UsersController` because that's where user-state mutations live
- No new repository — MFA state lives on `User`, so `IUserRepository` is sufficient
- No background job to clean up "stranded" `MFASecret` values from interrupted enrollments — they're just overwritten on the next `/setup` call

---

## 9. Audit & notifications

**Audit events** (all via existing `AuditLogService.LogAsync`):

| Action | When | Resource | Details JSON |
|---|---|---|---|
| `MFAEnrolled` | First successful `/verify` after `/setup` | User / target.UserID | `{ role }` |
| `MFAVerifySuccess` | Subsequent successful `/verify` | User / target.UserID | `{ role }` |
| `MFAVerifyFailed` | Invalid code at `/verify` | User / target.UserID | `{ reason: "Invalid code" }` |
| `MFAReset` | ITAdmin runs reset | User / target.UserID | `{ resetBy: <adminUserId>, targetRole }` |

**Notification** (via existing `NotificationService.NotifyAsync`):

| Trigger | Recipient | Severity | Message |
|---|---|---|---|
| `/mfa/reset` | target user | Warning | "Your MFA was reset by an administrator. You will be asked to enroll again on your next login." |

We deliberately do **not** push a notification on initial privileged-user creation (the user can't read notifications until they've completed MFA setup, so it would be invisible at the moment it matters). The login response's `Message` field covers that case directly.

---

## 10. Seeded admin bootstrap

`DbInitializer.SeedDefaultAdminAsync` will additionally:
- Set `MFASecret` to a fixed Base32 test value (defined as a public constant on `DbInitializer`, e.g. `DefaultAdminMfaSecret`).
- Set `MFAEnabled = true`.

**Why a fixed secret:** smoke tests need to compute a valid TOTP for the seeded admin without scanning a QR code. The constant lets `tests/smoke/lib/totp.sh` derive the code at runtime.

**Security note:** this is a known-secret bootstrap purely for local dev / smoke runs. Production deployments would override `DbInitializer` (or skip it entirely) and rely on real authenticator-app enrollment. Not a vulnerability in the local-dev context where the DB is anyway seeded with `admin/Admin@123`.

---

## 11. Smoke test changes

**Goal:** verify MFA enforcement is uniform across **all five privileged roles**, not a per-role accident.

### `tests/smoke/lib/seed.sh` (modify)

Today the seed script registers users (forced to Student by C-26), then SQL-promotes them to privileged roles, then re-logs them in. After this design lands:

- The SQL promotion sets `Role`, **plus** `MFASecret = '<fixed test b32>'`, **plus** `MFAEnabled = 1` for the five privileged users.
- The re-login flow for privileged users becomes: `/login` → receive `mfa_pending` token → compute TOTP via `lib/totp.sh` from the fixed secret → `/mfa/verify` → receive full JWT → export.

Two extra HTTP calls per privileged seed user. Instructor and Students keep today's single-call login.

### `tests/smoke/lib/totp.sh` (new)

Tiny helper using Node's built-in `crypto.createHmac` to compute RFC 6238 TOTP from a Base32 secret. Node is already a smoke-suite dependency (per the `cygpath -m` comment in `run-all.sh`). ~25 lines including Base32 decode.

```
totp_for_secret <base32_secret>   # echoes 6-digit code
```

### `tests/smoke/modules/00_auth.sh` (modify)

Existing assertions stay. Add a small set of MFA contract checks:
- Privileged login returns `mfa_pending` token, not full JWT (assert response has `mfaToken`, lacks the full session shape).
- The `mfa_pending` token is rejected on a normal endpoint (e.g. `GET /api/users` returns 401).
- `/mfa/verify` with wrong code returns 401.
- `/mfa/verify` with valid code returns full JWT.

These assertions iterate over **all 5 privileged role tokens** (loop, not one role).

### `tests/smoke/modules/26_mfa.sh` (new)

End-to-end flow for the enrollment path (separate from seed-pre-enrolled users):
1. ITAdmin creates a fresh Registrar via `POST /api/users` (MFAEnabled defaults to false).
2. Login as the new Registrar → `mfa_pending`, `Message` mentions "enrollment required".
3. `/mfa/setup` → returns secret + otpauth URI.
4. Compute TOTP from returned secret → `/mfa/verify` → full JWT, MFAEnabled now true.
5. Subsequent login → `mfa_pending`, `Message` mentions "code required" (challenge path).
6. ITAdmin runs `/api/users/{id}/mfa/reset` → 204.
7. Notification appears on target user's `/api/notifications` after they re-enroll and log in normally.
8. Re-enroll path works again from step 3.
9. Negative: Student login still returns full JWT directly (no MFA).
10. Negative: Instructor login still returns full JWT directly (no MFA).

### `tests/smoke/run-all.sh` (modify)

Add `26_mfa` to the module list, in the same dependency-order pattern as the existing modules.

### Estimated assertion count

Current suite: 256 PASS. New `26_mfa.sh`: ~12 assertions. Updates to `00_auth.sh` (looped over 5 roles): ~10 additional assertions. Updates to `seed.sh` re-login: covered implicitly by the seed log lines. Estimate post-change: ~278.

---

## 12. Documentation updates

### `docs/complete-testing-and-next-steps.md`

- Move IAM-03 from the "Known Gaps" table to "Done".
- Update the header summary line to reflect the new endpoint count (existing 100 → 103) and assertion count.
- Add **SECTION 19 — MFA (IAM-03)** at the end of the Swagger Test Sequence. Subsections:

| # | Sub-section | Demonstrates |
|---|---|---|
| 19.1 | ITAdmin (seeded admin) | Login → `mfa_pending` → compute TOTP from documented seed secret → `/verify` → full JWT |
| 19.2 | Registrar | ITAdmin mints a fresh Registrar via `POST /api/users` → first login → `mfa_pending` (enroll-mode) → `/setup` → `/verify` → full JWT → next login → `mfa_pending` (challenge-mode) |
| 19.3 | DeptAdmin | Same enrollment pattern |
| 19.4 | Finance | Same enrollment pattern (ties into existing Section 11 finance demo) |
| 19.5 | Auditor | Same enrollment pattern (ties into Section 12 audit log demo) |
| 19.6 | Negative — Student / Instructor | Show login returns full JWT directly; no MFA prompt |
| 19.7 | Admin reset | ITAdmin runs `/api/users/{id}/mfa/reset` → target's next login is `mfa_pending` (enroll-mode) again; notification visible after re-enrollment |

### Swagger

No manual config changes. New endpoints appear automatically because `Program.cs` already wires `IncludeXmlComments`. Each new endpoint will carry `/// <summary>` covering: purpose, required token type, role gating, expected response codes.

### `docs/PRD-DISCREPANCIES.md`

Remove the IAM-03 entry if it appears as an outstanding discrepancy.

---

## 13. Verification & commit flow

1. Implementation completes (per the writing-plans plan generated next).
2. `migrate-database.bat` runs locally → `MFASecret` column added.
3. `dotnet build` → must be 0 errors, 0 warnings (matching the existing project standard).
4. `bash tests/smoke/run-all.sh` end-to-end → must pass all assertions including new MFA module.
5. **Stop here.** Show user the proposed commit message and `git status` / `git diff --stat` summary.
6. Only after explicit "commit" approval, run `git add` + `git commit`.
7. Push only on explicit instruction.

**Sample commit message** (real one to be drafted at commit time, no `Co-Authored-By` trailer):

```
feat(IAM-03): add TOTP MFA for privileged roles

- Mandatory for Registrar, DeptAdmin, Finance, ITAdmin, Auditor
- New endpoints: POST /api/auth/mfa/setup, POST /api/auth/mfa/verify,
  POST /api/users/{id}/mfa/reset
- Schema: Users.MFASecret nvarchar(128) null
- TOTP via Otp.NET (RFC 6238)
- Login response carries Message hint when MFA action required
- Notification on admin reset via existing NotificationService
- Audit events: MFAEnrolled, MFAVerifySuccess, MFAVerifyFailed, MFAReset
- Seeded admin pre-enrolled with fixed test secret for smoke runs
- Smoke tests: new module 26_mfa.sh, lib/totp.sh helper,
  seed.sh pre-enrolls all 5 privileged users
- Docs: complete-testing-and-next-steps.md Section 19 walks all 5 roles
```

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Clock skew between server and authenticator app causes valid codes to fail | Otp.NET default `VerificationWindow.RfcSpecifiedNetworkDelay` allows ±1 step. Sufficient for a college network. |
| `mfa_pending` token leaked between `/setup` and `/verify` could let attacker overwrite secret | `/setup` rejects when `MFAEnabled=true`. Pending token is 5 min lived. |
| Seeded fixed test secret accidentally shipped to a real deployment | Documented in spec and DbInitializer comments that this is local-dev only; production deployments override seeding. |
| Otp.NET package vulnerability appears later | Standard NuGet update path; library is small enough to vendor if it ever became necessary. |
| Smoke harness Node dependency unavailable on a teammate's machine | Already a hard requirement of the smoke harness; documented. |

---

## 15. Open items

None at design time. Implementation plan to be generated via the `superpowers:writing-plans` skill next.
