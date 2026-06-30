# Auth Session Isolation — BadlyTalks ↔ Breakthrough Protocol

**Problem:** Signing into BadlyTalks logged the user out of Breakthrough Protocol (BP).
**Goal:** Both apps stay logged in independently; logging in/out of one never affects the other.

---

## Architecture (confirmed)

BadlyTalks and Breakthrough Protocol use **separate Supabase projects**. That means
their auth servers are independent — a login or sign-out in one project can **never**
revoke a session in the other. So the cross-app logout was **not** server-side.

## Root cause

supabase-js persists the auth session in **localStorage** (keyed by project ref).
The actual cross-app culprit was a localStorage side effect that only bites when the
two apps share a browser **origin** (same custom domain, or both on `localhost`
during development):

| # | Defect | Effect | Cross-app impact (separate projects) |
|---|--------|--------|--------|
| 3 | **Startup migration wiped ALL `sb-*-auth` keys** | On first BadlyTalks load it deleted every Supabase auth key in localStorage | **THE root cause.** On a shared origin it erased BP's `sb-<bp-ref>-auth-token` → BP logged out. |
| 1 | **No custom `storageKey`** (default `sb-<ref>-auth-token`) | Generic, project-ref-based key | Lower risk with separate projects (refs differ), but a shared, generic namespace is fragile. Fixed for defense-in-depth. |
| 2 | **`signOut()` used `scope: 'global'`** | Revokes the user's refresh tokens project-wide | Does **not** reach BP (different project). Changed to `local` anyway so logout never propagates, even across the user's own devices. |

---

## Auth flow — before vs. after

Shared browser origin (same domain, or both on localhost), separate Supabase projects:

### Before (cross-app logout)
```
   localStorage (one shared origin)
   ┌─────────────────────────────────────────────┐
   │  sb-<badlytalks-ref>-auth-token   (BadlyTalks)│
   │  sb-<bp-ref>-auth-token           (BP session)│
   └─────────────────────────────────────────────┘
            ▲
   BadlyTalks startup runs:
   "delete every key matching sb-*-auth"   ✗ also deletes BP's key
            │
            ▼
   BP refresh → no token in storage → LOGGED OUT
```

### After (isolated)
```
   localStorage (even if same origin)
   ┌─────────────────────────────────────────────┐
   │  badlytalks-auth          (BadlyTalks — own)  │
   │  sb-<bp-ref>-auth-token   (BP — untouched)    │
   └─────────────────────────────────────────────┘
   BadlyTalks no longer wipes sb-* keys, and reads/writes only its
   own "badlytalks-auth" namespace → BP session is never touched.
   signOut(scope:'local') clears only badlytalks-auth.
```

---

## Exact fixes applied (this repo)

**`src/lib/supabase.ts`**
- Added a private **`storageKey: 'badlytalks-auth'`** to the client's `auth` options.
  BadlyTalks now owns its localStorage namespace and can never collide with BP.
- **Removed** the startup loop that bulk-deleted all `sb-*-auth` localStorage keys
  (it could destroy a co-hosted app's session). It's unnecessary now because the
  custom `storageKey` means stale legacy keys are simply never read.

**`src/lib/auth.ts`**
- `signOut()` now calls **`supabase.auth.signOut({ scope: 'local' })`** — clears only
  BadlyTalks' session; never revokes the user's BP session server-side.

> One-time effect: because the storage key changed, anyone currently logged into
> BadlyTalks is logged out **once** and must sign in again. New sessions live under
> `badlytalks-auth`. This does not affect BP.

---

## Does this fully resolve it?

**Separate projects are confirmed**, so:
- No Supabase setting change is needed (no "single session" concern — that only
  applies within one shared project).
- The fixes in this repo remove the **only** remaining cross-app vector: the
  shared-origin localStorage wipe. BadlyTalks now stores its session under
  `badlytalks-auth` and never deletes any other app's keys.

**Where does the shared origin come from?** Cross-app logout only occurs when both
apps run on the **same browser origin**. Confirm which case you have:
- **Production, different domains** (`clarity-mode…vercel.app` vs
  `breakthrough-protocol.vercel.app`) → different origins → the bug couldn't occur
  there at all. If you saw it here, check that the two apps aren't behind one shared
  custom domain.
- **Local development** (both on `localhost`) → same origin → this was the trigger.
  Now fixed.

**Optional BP-side hardening (mirror of these fixes), recommended for completeness:**
- Give BP's supabase client its own `storageKey` (e.g. `breakthrough-auth`).
- Remove any equivalent "clear all `sb-*` keys" startup logic in BP.
- Use `signOut({ scope: 'local' })` in BP.

---

## Testing checklist

| Step | Expected |
|------|----------|
| Log into BP | BP authenticated |
| Open BadlyTalks, log in (same or different account) | BadlyTalks authenticated |
| Return to BP, refresh | **Still logged in** |
| Refresh BadlyTalks | Still logged in |
| Sign out of BadlyTalks | BP **stays** logged in |
| Sign out of BP | BadlyTalks stays logged in |
| Repeat on mobile (iOS Safari + Android Chrome) | Same — both stay authenticated |
| Repeat on desktop | Same |

Verify in DevTools → Application → Local Storage that BadlyTalks stores **`badlytalks-auth`**
and BP stores a **different** key — never the same one.

---

## Status

- ✅ Root cause identified: the startup loop that deleted **all** `sb-*-auth`
  localStorage keys wiped BP's session whenever the apps shared an origin.
- ✅ BadlyTalks-side fixes applied, type-checked, and built: private `storageKey`,
  removed the bulk key wipe, `signOut({ scope: 'local' })`.
- ✅ Separate Supabase projects confirmed → no Supabase dashboard change required.
- ⬜ Optional: mirror the same hardening in the BP repo (own `storageKey`, no `sb-*`
  wipe, local sign-out).
- ⚠️ Live cross-app behaviour not yet verified on devices — run the checklist above
  after deploy.
