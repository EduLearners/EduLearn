# Page Spec — MFA Verify

**Route:** `/mfa-verify`
**Component:** `src/pages/auth/MfaVerifyPage.tsx`
**Guard:** requires `mfaPendingToken` in sessionStorage
**Register:** product
**Color strategy:** Restrained (inherited from Brief 01)
**Status:** Ready for implementation

---

## 1. Purpose

TOTP code entry on every privileged-role login after MFA is already enrolled. User arrives here after login password check succeeds for Registrar, DeptAdmin, Finance, ITAdmin, Auditor roles.

Minimal surface. The only task: enter the 6 digits, submit. Every extra element is friction.

---

## 2. Layout

Centered form, no split-panel. MFA is a focused micro-task — no brand marketing needed here.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│    EduLearn           ← compact wordmark, brand-500    │
│                                                        │
│    Two-factor         ← h1, display tier               │
│    authentication                                      │
│                                                        │
│    Open your          ← body copy, neutral-700         │
│    authenticator app  ← IBM Plex Sans 1rem             │
│    and enter the                                       │
│    6-digit code.                                       │
│                                                        │
│    [ 3 ][ 5 ][ 7 ] [ _ ][ _ ][ _ ]  ← OTP input      │
│                                                        │
│    [Verify]           ← primary button, full-width     │
│                                                        │
│    ─────────────────────────                           │
│                                                        │
│    Sign in with a     ← link, brand-700                │
│    different account                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Form max-width: 360px, centered, `margin: auto`, `padding: space-12 space-8`.

---

## 3. OTP input

Identical spec to mfa-setup.md §5:
- 6 individual `<input type="tel" maxlength="1">` fields
- `inputmode="numeric"`, auto-advance, backspace-retreat, paste-distribute
- Separator gap between digit 3 and 4
- `role="group" aria-label="6-digit verification code"`

Auto-focus on first digit input on mount (no extra click required).

---

## 4. States

| State | Render |
|---|---|
| **Default** | Empty inputs, Verify button enabled |
| **Submitting** | Button: "Verifying..." + spinner, inputs disabled |
| **Wrong code** | Error: "That code did not match. Check your authenticator app and try again." Inputs clear, refocus first. |
| **Expired code** | Error: "That code has expired. Your authenticator generates a new code every 30 seconds." |
| **Too many attempts (5 fails)** | Error: "Too many failed attempts. Your account has been locked. Contact your IT Admin." Sign in link shown. Verify button disabled. |
| **Success** | 150ms checkmark, then navigate('/') |
| **No pending token** | Redirect to /login immediately on mount |

---

## 5. API call

```
POST /api/auth/mfa/verify
  Header: Authorization: Bearer {mfaPendingToken}
  Body: { code: "357124" }
  Response: { token: "full-jwt..." }

On success:
  sessionStorage.set('jwt', token)
  sessionStorage.remove('mfaPendingToken')
  navigate('/')
```

---

## 6. "Sign in with a different account" link

Clears `mfaPendingToken` from sessionStorage and navigates to `/login`. Labelled clearly — user who entered wrong username earlier can escape without being stuck on MFA screen.

```jsx
<a
  href="#"
  onClick={(e) => {
    e.preventDefault()
    sessionStorage.removeItem('mfaPendingToken')
    navigate('/login')
  }}
>
  Sign in with a different account
</a>
```

---

## 7. Semantic HTML

```html
<main aria-label="Two-factor authentication">
  <a href="/" class="brand-mark">EduLearn</a>
  <h1>Two-factor authentication</h1>
  <p>Open your authenticator app and enter the 6-digit code.</p>
  <form aria-label="Enter verification code">
    <div role="group" aria-label="6-digit verification code">
      {digits}
    </div>
    <div role="alert" aria-live="assertive" class="error" />
    <button type="submit">Verify</button>
  </form>
  <hr />
  <a href="#" onClick={clearAndReturn}>Sign in with a different account</a>
</main>
```

---

## 8. Mobile

Same centered layout at all breakpoints. OTP digit fields expand to fill available width (flexbox equal-width). Min field size 44×44px touch target.

---

## 9. Motion

Same as mfa-setup: 200ms error fade, 150ms success checkmark, all killed under `prefers-reduced-motion`.

---

## 10. Implementation notes

1. Reuse the OTP input group component from mfa-setup — extract to `src/components/auth/OtpInputGroup.tsx`.
2. Auto-focus on first digit input: `useEffect(() => { inputRefs[0].current?.focus() }, [])`.
3. After any failed verification: clear all digits, focus input[0]. TOTP codes expire — user must re-enter.
4. The "too many attempts" lock state should be handled client-side based on a failure counter stored in component state (reset on page reload). Backend will return 400/401 regardless; the lock message is a UX choice, not a server response.
5. Both mfa-setup and mfa-verify guard: on mount, check `sessionStorage.getItem('mfaPendingToken')`. If absent, `navigate('/login')`. No flash of content.
