# Page Spec — Login

**Route:** `/login`
**Component:** `src/pages/auth/LoginPage.tsx`
**Register:** product (form gate, not marketing)
**Color strategy:** Committed (brand-500 panel ~50% of desktop surface — login earns this override of Restrained)
**Status:** Ready for implementation

---

## 1. Purpose

First impression before any authenticated surface. Evaluator sees brand identity + institutional voice in under 2 seconds. Student/staff arrives with credentials already in hand — minimize friction, maximize trust.

**Scene sentence:** "A registrar opening a new tab at 8:55am before their first applicant review. Clear desk, fluorescent light, institutional urgency. They need to be inside in 3 clicks."

---

## 2. Layout

### Desktop ≥640px — split-panel

```
┌───────────────────────┬───────────────────────┐
│                       │                       │
│   EduLearn            │   Sign in             │
│                       │   ─────────────────   │
│   The modern          │   Username            │
│   university          │   [_________________] │
│   platform.           │                       │
│                       │   Password            │
│                       │   [_________________] │
│   brand-500 bg        │                       │
│   neutral-0 text      │   [Sign in]           │
│                       │                       │
│                       │   Forgot your         │
│                       │   password?           │
│                       │                       │
│   © EduLearn 2026     │   New student?        │
│                       │   [Apply now]         │
└───────────────────────┴───────────────────────┘
```

- Left: 50% width, `background: brand-500`, full viewport height, `padding: space-16 space-12`
- Right: 50% width, `background: neutral-0`, centered vertically, `padding: space-12`
- No card or border around the form — form sits directly on neutral-0

### Mobile <640px — form only

Brand panel collapses. Single column: brand mark (compact, 24px, brand-500 color on neutral-0 background) at top-center, form below. `padding: space-6`.

---

## 3. Brand panel (left) — detailed spec

```
EduLearn                    ← wordmark, IBM Plex Sans 28px weight 700
                               neutral-0 (#fdfcfa)
                               letter-spacing: -0.01em

The modern university       ← IBM Plex Sans 18px weight 400
platform.                      neutral-0 at 80% opacity (muted)
                               line-height: 1.4
                               max-width: 22ch
```

Layout within panel: brand mark in upper third (`padding-top: space-16`). Tagline below with `margin-top: space-4`. No other elements. No illustration. No decorative elements. No quote. No feature list.

Footer: `© EduLearn 2026` — caption tier, neutral-0 at 60% opacity, pinned to `position: absolute; bottom: space-8`.

Brand panel does **not** use glassmorphism, gradient overlays, or any pattern/texture. Flat brand-500 surface only.

---

## 4. Form panel (right) — detailed spec

Vertically and horizontally centered within right half. Form max-width: 360px.

```
Sign in                       ← h1, IBM Plex Sans 1.5rem weight 600 neutral-900
                                 margin-bottom: space-8

Username                      ← <label> 0.875rem weight 500 neutral-700
[_______________________]     ← <input type="text"> autocomplete="username"
                                 full-width, form-control override

Password                      ← <label> + [show/hide icon button at right]
[_______________________]     ← <input type="password"> autocomplete="current-password"
                                 full-width, show/hide toggles between type="password/text"

[Sign in]                     ← <Button variant="primary" type="submit" className="w-100">
                                 IBM Plex Sans 1rem weight 600
                                 height: 44px (minimum touch target)
                                 margin-top: space-6

Forgot your password?         ← <a> text-link, 0.875rem, brand-700
                                 margin-top: space-4, text-align: center

──────────────────────        ← <hr> neutral-200, margin: space-6 0

New student?                  ← 0.875rem neutral-600
[Apply now]                   ← inline link, brand-700, navigates to /register
```

---

## 5. Typography on brand panel — contrast check

- neutral-0 (#fdfcfa) on brand-500 (#1f4d2c): 7.1:1 — AAA ✅
- neutral-0 at 80% opacity on brand-500: still well above 4.5:1 ✅
- neutral-0 at 60% opacity (footer): ~4.2:1 — borderline for 12px caption. Use `opacity: 0.75` minimum for WCAG AA compliance at 12px.

---

## 6. Form interaction states

Per component-map.md section 8 (Input states):

| State | Username | Password |
|---|---|---|
| default | neutral-100 bg, neutral-200 border | same |
| focus | neutral-0 bg, 2px brand-500 border | same |
| error | neutral-0 bg, 2px danger-500 border | same |
| loading (submitting) | disabled + opacity 0.6 | same |

**Validate on submit only** (not blur) for login — premature error on blur ("username required") before the user has finished the form is disruptive. Error state after failed submit attempt.

**Show/hide password:** `<button type="button" aria-label="Show password">` with `bi-eye` / `bi-eye-slash` at 16px. Toggle `input.type` between `"password"` and `"text"`. Focus returns to password field on toggle.

---

## 7. States

| State | Render |
|---|---|
| **Default** | Empty form, Sign in button enabled |
| **Submitting** | Button: loading spinner + "Signing in..." label, form fields disabled |
| **Wrong credentials** | Error below form: "Username or password is incorrect. Try again, or reset your password below." (from error-messages.md §1). No field-level errors on login (never reveal which field is wrong). |
| **Account locked** | Error: "Your account is locked. Contact your IT Admin to unlock it." Sign in button disabled. |
| **Account suspended** | Error: "Your account is suspended. Contact your registrar to resolve this." |
| **MFA required** | On success + MFA role: redirect to `/mfa-verify` with interim JWT in sessionStorage |
| **Already logged in** | If JWT valid in sessionStorage: redirect to `/` immediately on mount |

**No registration link for staff roles.** The "New student? Apply now" link navigates to `/register` (public applicant form). Staff accounts are created by ITAdmin.

---

## 8. Auth flow on submit

```
POST /api/auth/login → { token, requiresMfa }

if requiresMfa:
  sessionStorage.set('mfaPendingToken', token)
  navigate('/mfa-verify')
else:
  sessionStorage.set('jwt', token)
  navigate('/')  ← resolves to persona's dashboard
```

No refresh token. No cookie. Token lives in `sessionStorage` — clears on tab close per mentor-approved auth approach.

---

## 9. Semantic HTML

```html
<main id="main-content" aria-label="Sign in">
  <div class="split-panel">
    <section class="brand-panel" aria-hidden="true">
      <!-- aria-hidden: purely presentational brand surface -->
      <div class="brand-mark">EduLearn</div>
      <p class="brand-tagline">The modern university platform.</p>
    </section>
    <section class="form-panel">
      <form method="post" aria-label="Sign in to EduLearn">
        <h1>Sign in</h1>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" type="text" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="password-field">
            <input id="password" type="password" autocomplete="current-password" required />
            <button type="button" aria-label="Show password" aria-pressed="false">
              <i class="bi bi-eye" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div role="alert" aria-live="assertive" class="error-message" />
        <button type="submit" class="btn btn-primary w-100">Sign in</button>
        <a href="/forgot">Forgot your password?</a>
      </form>
      <hr />
      <p>New student? <a href="/register">Apply now</a></p>
    </section>
  </div>
</main>
```

`aria-hidden="true"` on brand panel — it's decorative, no actionable content.
`role="alert" aria-live="assertive"` on error div — screen reader immediately announces auth failure.

---

## 10. Responsive

| Breakpoint | Change |
|---|---|
| ≥640px | Split-panel, 50/50 |
| <640px | Brand panel hidden. Form full-width, centered, brand-500 brand mark at top |

Brand mark on mobile: wordmark "EduLearn" in `brand-500` text, `margin: space-8 auto space-6`, 24px weight 700.

---

## 11. Motion

- Page loads with 300ms fade-in on form panel (ease-out-expo). Brand panel fades in simultaneously.
- Submit button: spinner replaces text (100ms transition).
- Error message: 200ms fade-in (ease-out-expo).
- All killed under `prefers-reduced-motion`.

---

## 12. Error messages

From `error-messages.md` §1:
- Wrong credentials: "Username or password is incorrect. Try again, or reset your password below."
- Locked: "Your account is locked after too many failed attempts. Contact your IT Admin to unlock it."
- Suspended: "Your account is suspended. Contact your registrar to resolve this."
- Network error: "We could not complete this action. Try again."

Rendered in `<div role="alert">` below password field, above Sign in button.

---

## 13. Implementation notes

1. Brand panel `aria-hidden="true"` — prevents screen readers navigating to decorative text.
2. `autocomplete="username"` and `autocomplete="current-password"` — enables browser password managers. Do not disable.
3. Error messages must NOT say "wrong username" or "wrong password" separately — always generic "username or password" to prevent user enumeration.
4. On Enter key in username field: focus moves to password field (standard HTML form behavior, no JS needed).
5. `input[type="text"]` for username, NOT `input[type="email"]` — usernames are not emails in this system.
6. Brand panel background `brand-500` (#1f4d2c). Do not use `linear-gradient` — flat color only.
