# Auth Session Isolation — BadlyTalks ↔ Breakthrough Protocol

**Problem:** Signing into BadlyTalks logged the user out of Breakthrough Protocol (BP).
**Goal:** Both apps stay logged in independently; logging in/out of one never affects the other.

---

## Root cause

supabase-js persists the auth session in **localStorage**. Three things in BadlyTalks
let one app stomp on the other's session:

| # | Defect | Effect |
|---|--------|--------|
| 1 | **No custom `storageKey`** — used the default `sb-<project-ref>-auth-token` | If BP shares the same origin or the same Supabase project, both apps read/write the **same** localStorage key. Whoever logs in last overwrites the other's session. |
| 2 | **`signOut()` used the default `scope: 'global'`** | Signing out (or any sign-out triggered internally) revokes **every** refresh token for that user across all apps/devices on the project → BP's session is killed server-side. |
| 3 | **Startup migration wiped ALL `sb-*-auth` keys** | On first BadlyTalks load it deleted every Supabase auth key in localStorage — including BP's, if co-hosted on the same origin. |

> Why this is even possible: this Supabase project (`llflerfeiwhicrmunqzw`) manages
> **both** websites (`clarity-mode` / BadlyTalks **and** `breakthrough-protocol`).
> If BP's live app authenticates against this same project, the two share an auth
> namespace by default. Different browser origins isolate localStorage, but the
> **default storage key + global sign-out** still cross-contaminate at the project level.

---

## Auth flow — before vs. after

### Before (cross-app logout)
```
        BadlyTalks                         Breakthrough Protocol
            │                                       │
   login as user X                                  │  (already logged in as X)
            │                                       │
            ▼                                        ▼
   write localStorage key ───────── SAME KEY ──────► overwrites BP's session
   sb-<ref>-auth-token                              sb-<ref>-auth-token
            │                                       │
            │  signOut(scope:'global')              │
            └────────── revokes ALL refresh tokens ─► BP session revoked → logged out
```

### After (isolated)
```
        BadlyTalks                         Breakthrough Protocol
            │                                       │
   login as user X                          (logged in as X — untouched)
            ▼                                        ▼
   write localStorage key                    write its OWN key
   "badlytalks-auth"   ◄── different keys ──►  sb-<ref>-auth-token
            │                                       │
            │  signOut(scope:'local')               │
            └── clears only badlytalks-auth ────────┘  BP session intact
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

## Server-side / BP-side actions (cannot be done from this repo)

Whether the above fully resolves it depends on BP's setup, which lives in a separate
codebase. Do the checks/changes that apply:

1. **If BP uses the SAME Supabase project** as BadlyTalks (`llflerfeiwhicrmunqzw`):
   - In **Supabase Dashboard → Authentication → Sessions**, ensure **"Enforce single
     session per user" is OFF**. If it's on, logging into BadlyTalks revokes BP's
     session on the next refresh (sign-in-triggered logout).
   - In BP's code, give **its** supabase client a **different** `storageKey`
     (e.g. `breakthrough-auth`) and use **`signOut({ scope: 'local' })`** too —
     the mirror image of the fixes here.

2. **If BP uses its OWN Supabase project** (as an older code comment claims):
   - Then sessions are already independent at the project level, and the fixes in
     this repo (unique key + no bulk wipe) remove the only remaining cross-app vector
     (shared-origin localStorage). No Supabase setting change needed.

3. **Recommended end state for guaranteed isolation:** different `storageKey` per app
   **and** `scope: 'local'` sign-out in both apps. (Separate Supabase projects make it
   bulletproof but aren't strictly required once keys + scopes are isolated.)

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

- ✅ Root cause identified (default storage key + global sign-out + bulk key wipe).
- ✅ BadlyTalks-side fixes applied, type-checked, and built.
- ⚠️ BP-side mirror changes + the Supabase "single session" check must be done in the
  BP project/repo (no access from here).
- ⚠️ Live cross-app behaviour not yet verified on devices — run the checklist above
  after both apps are deployed.
