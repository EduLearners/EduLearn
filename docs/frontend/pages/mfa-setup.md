# Page Spec — MFA Setup

**Route:** `/mfa-setup`
**Component:** `src/pages/auth/MfaSetupPage.tsx`
**Guard:** requires `mfaPendingToken` in sessionStorage (set by login for privileged roles)
**Register:** product
**Color strategy:** Restrained (inherited from Brief 01)
**Status:** Ready for implementation

---

## 1. Purpose

First-time TOTP enrollment for privileged roles (Registrar, DeptAdmin, Finance, ITAdmin, Auditor). User lands here directly after successful login password check, before receiving their full JWT.

The flow is: login → backend detects role requires MFA → returns `mfaPendingToken` → frontend redirects here → user scans QR → enters code → backend issues full JWT → redirect to `/`.

**This page is shown once per account.** On subsequent logins, users go directly to `/mfa-verify` (MFA already enrolled).

---

## 2. Layout

No split-panel — MFA setup is a focused single task. Centered form on neutral-0.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│    EduLearn                   ← compact wordmark       │
│                                                        │
│    Set up two-factor          ← h1, display tier       │
│    authentication             ← (wraps at ~20ch)       │
│                                                        │
│    Scan this QR code with     ← body copy, 65ch max    │
│    your authenticator app     ← (Google Authenticator, │
│    (Google Authenticator,       Authy, 1Password)      │
│    Authy, 1Password).                                  │
│                                                        │
│    ┌─────────────────────┐                             │
│    │                     │                             │
│    │   [QR CODE IMAGE]   │  ← 200×200 canvas/img      │
│    │                     │    generated via qrcode.js  │
│    └─────────────────────┘                             │
│                                                        │
│    Can't scan?                                         │
│    [Copy setup key]  ← button reveals key below        │
│    [hidden: JBSA WCZT K5DU OPQR]                       │
│                                                        │
│    ─────────────────────────                           │
│                                                        │
│    Enter the 6-digit code     ← label                  │
│    from your app                                       │
│    [ _ ][ _ ][ _ ] [ _ ][ _ ][ _ ]  ← OTP input       │
│                                                        │
│    [Verify and continue]      ← primary button         │
│                                                        │
│    Having trouble? Contact IT support.                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Form max-width: 400px, centered, `margin: space-8 auto`, `padding: space-12 space-8` on mobile.

---

## 3. QR code

Generated client-side from `otpauthUri` returned by `POST /api/auth/mfa/setup`. Use the `qrcode` npm package (MIT license, ~3kB gzip, no external service).

```ts
import QRCode from 'qrcode'

useEffect(() => {
  QRCode.toCanvas(canvasRef.current, otpauthUri, {
    width: 200,
    margin: 2,
    color: { dark: '#1f4d2c', light: '#fdfcfa' }, // brand-500 on neutral-0
  })
}, [otpauthUri])
```

Canvas element: `aria-label="QR code for setting up two-factor authentication. If you cannot scan it, use the setup key below."` — screen readers cannot read QR codes; the copy-key fallback is mandatory.

---

## 4. Copy setup key fallback

"Can't scan?" link reveals the Base32 key inline (no modal — inline expand, 200ms height transition).

```
Can't scan?
▼ Show setup key

Setup key:
JBSA WCZT K5DU OPQR          ← IBM Plex Mono, 1rem, letter-spacing: 0.08em
                                 groups of 4 for readability, neutral-800

[Copy key]                    ← copies raw key to clipboard, changes to
                                 [Copied ✓] for 2s then reverts
```

Key never shown by default — minimizes phishing risk (key on screen = anyone can shoulder-surf). Shown only on user intent.

---

## 5. OTP input field

6 individual `<input type="tel" maxlength="1">` fields, auto-advance on input:

```
[ 3 ][ 5 ][ 7 ] [ 1 ][ 2 ][ 4 ]
```

- Visual separator (thin `neutral-200` gap) between digits 3 and 4 (grouping common in TOTP apps).
- `inputmode="numeric"` — numeric keypad on mobile.
- Auto-advance: on single digit input, focus moves to next field.
- Backspace: if field empty, focus moves to previous field.
- Paste: if user pastes 6 digits, distributes across all fields automatically.
- `aria-label="Verification code digit {n} of 6"` on each input.
- Group wrapped in `<div role="group" aria-label="6-digit verification code">`.

Alternative: single `<input type="tel" maxlength="6">` with custom CSS splitting display. Either approach is valid; the 6-field approach is more standard for TOTP UI.

---

## 6. States

| State | Render |
|---|---|
| **Loading (fetching setup data)** | Spinner in QR area (200×200 skeleton), form fields disabled |
| **Default (QR loaded)** | QR visible, code inputs empty, button enabled |
| **Submitting** | Button: "Verifying..." + spinner, inputs disabled |
| **Wrong code** | Inline error below inputs: "That code did not match. Check your authenticator app and try again." Inputs clear and refocus on first field. |
| **Expired code** | "That code has expired. Your authenticator app generates a new code every 30 seconds." |
| **Success** | 200ms checkmark animation, then `navigate('/')` with full JWT stored |
| **No pending token** | If `mfaPendingToken` absent from sessionStorage: redirect to `/login` |

---

## 7. API calls

```
GET (on mount): POST /api/auth/mfa/setup
  Header: Authorization: Bearer {mfaPendingToken}
  Response: { mfaSecret: "JBSAWCZTK5DU...", otpauthUri: "otpauth://totp/EduLearn:aarav@...?secret=..." }

POST (on verify): POST /api/auth/mfa/verify
  Header: Authorization: Bearer {mfaPendingToken}
  Body: { code: "357124" }
  Response: { token: "full-jwt..." }
  On success: sessionStorage.set('jwt', token), sessionStorage.remove('mfaPendingToken'), navigate('/')
```

---

## 8. Semantic HTML

```html
<main aria-label="Set up two-factor authentication">
  <header>
    <a href="/" class="brand-mark">EduLearn</a>
  </header>
  <section class="mfa-setup-form">
    <h1>Set up two-factor authentication</h1>
    <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password).</p>
    <canvas ref={canvasRef} aria-label="QR code for two-factor setup..." />
    <details>
      <summary>Can't scan?</summary>
      <p>Setup key: <code class="setup-key">{formattedKey}</code></p>
      <button type="button">Copy key</button>
    </details>
    <form aria-label="Enter verification code">
      <label>Enter the 6-digit code from your app</label>
      <div role="group" aria-label="6-digit verification code">
        {[0..5].map(i => <input type="tel" maxLength={1} aria-label={`Digit ${i+1} of 6`} />)}
      </div>
      <div role="alert" aria-live="assertive" />
      <button type="submit">Verify and continue</button>
    </form>
    <p>Having trouble? <a href="/tickets/new">Contact IT support</a>.</p>
  </section>
</main>
```

Using `<details>/<summary>` for the copy-key fallback — native expand/collapse, keyboard accessible, no JS required for basic behavior.

---

## 9. Mobile

<640px: same centered layout, full-width inputs, QR scales to min(200px, 80vw). Setup key displays in wrapping mono text, not a horizontal strip.

---

## 10. Motion

- QR canvas: 300ms fade-in after generation (ease-out-expo).
- Setup key expand: `<details>` native transition + 200ms max-height.
- Error message: 200ms fade-in.
- Success: 150ms checkmark scale (1→1.2→1), then navigate after 300ms.
- All killed under `prefers-reduced-motion`.

---

## 11. Implementation notes

1. `qrcode` package: `npm install qrcode` + `@types/qrcode`. Renders to Canvas. Do not use an external QR API — the secret must never leave the client.
2. Auto-advance on OTP inputs: `onInput` handler, `nextSibling.focus()` pattern. Handle paste via `onPaste` on the parent group.
3. `<details>/<summary>` for the copy-key section uses native browser expand. No need for custom Offcanvas or Collapse unless Bootstrap's `<Collapse>` is preferred for consistent animation.
4. After failed verify, always clear all 6 OTP input fields and focus the first — TOTP codes expire and the user needs to re-enter.
