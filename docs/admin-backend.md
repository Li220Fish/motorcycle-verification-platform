# MotoVerify 營運後台 (/admin)

A desktop-first internal ops tool, deliberately separate from the mobile
app's views/components/design tokens (`src/admin/`, own stylesheet, own
layout — no `AppHeader`/`BottomNavigation`). Built from a reference mockup
provided 2026-09-03. Wired to the same live Firebase project (client SDK
only, same as the rest of this app — no Admin SDK / service account key).

## Access

- URL: `/admin` (redirects to `/admin/login` if not signed in as the admin).
- Login form accepts the literal **`test` / `test`** — this is exchanged
  behind the scenes for a real seeded Firebase Auth account
  (`src/admin/services/admin-auth.service.ts`), so Firestore's security
  rules still see a genuine authenticated session instead of a fake
  client-only flag.
- Real account: `admin@test.com` / `test1234` (uid `CMWrmo2pHsRiBu5kMj1CDJ23xd72`),
  one of the 5 fixed accounts created by `scripts/seed-test-users.mjs`
  (`ALLOW_TEST_SEED=true node scripts/seed-test-users.mjs` to (re)create all
  5 — idempotent). See [docs/test-accounts.md](test-accounts.md).
  (Superseded 2026-09-04 — previously `admin@motoverify.internal` via the
  now-deleted `scripts/seed-admin-user.mjs`.)
- Signing into `/admin` uses the same shared Firebase Auth session as the
  mobile app (one Firebase App instance) — it will sign the browser tab out
  of any regular MotoVerify account that happened to be logged in there.
  Open `/admin` in its own browser/profile if you need both at once.

## Authorization model

- `firestore.rules` hardcodes the admin's uid in an `isAdmin()` check rather
  than a client-writable `admins/{uid}` allowlist collection — any rule
  permissive enough to let a client write such an allowlist would let any
  signed-in user self-grant admin and read every private conversation and
  moderation report. Changing who is an admin means editing that uid in
  `firestore.rules` and redeploying — there is no in-app "add an admin" flow.
- Most collections the app already leaves open to any signed-in user
  (`vehicles`, `verifications`, `marketplaceListings`, `vehicleNews`,
  `users/{uid}`, `discussionPosts` + `comments`) needed no rule changes.
  `conversations` (+ `messages`) and `discussionReports` were member/creator
  -scoped, so `isAdmin()` was added as a bypass on read (and on
  `discussionReports` update, to resolve reports) only — write access to
  conversations/messages is unchanged.

## New Firestore collections/fields (this is the "what would need to be
added" report)

| Collection / field | Written by | Purpose |
|---|---|---|
| `users/{uid}` — now actually populated | `src/services/firebase/user-profile.service.ts`, called from `auth.store.ts` on every auth-state resolution and on display-name change | **The foundational fix.** Firebase Auth has no client-listable "all users" API (only the Admin SDK, which this project deliberately doesn't use) — the admin's entire user roster reads this mirror instead. Only accounts that have signed in **since this change shipped** appear; older sessions self-heal on next login. |
| `vehicleModels/{id}` | 車款主檔 section (list/add/delete) | New collection for a standardized brand/series list. The mobile app's vehicle/listing forms still take free-text brand/model — this collection doesn't constrain or validate them yet. To "do something" it would need those forms to select from this list instead of free text. |

The reference mockup's 文案合規檢查 (copy compliance checker), 同意書與授權管理
(consent/authorization), 環境旗標 (env flags), and 推播與提醒 (push/notification
toggles) pages were all removed on request (2026-09-03) — along with the
`adminSettings` collection entirely (its `notifications`/`privacy`/`envFlags`
docs and its rule), the unused `disclaimers`/`consents` collections and
rules, and the corresponding nav entries. Nothing else depended on any of
them.

## Known gaps (real data doesn't exist for these — shown as empty/"—" with an
explanation in the UI, not fabricated)

1. **No event tracking anywhere in the app.** Every "page visit heatmap",
   "interest funnel", "drop-off by step", "retention cohort" panel in the
   reference mockup needs a record of what a user viewed/clicked and when.
   This app has zero instrumentation for that today — none of the mobile
   views write to an `events` collection. Overview's "使用者最常出現在哪個
   功能", Behaviour's whole page, and Verify's funnel/drop-off metric are all
   real UI wired to real (empty) queries, honestly reporting "no data" rather
   than inventing numbers.
2. **Retention needs a login-history collection.** `users/{uid}.lastSeenAt`
   only keeps the *most recent* sign-in — there's no per-login timestamp log,
   so "次日/7天/30天留存" can't be reconstructed even approximately.
3. **Probe telemetry is entirely unwired.** `voltageSessionService.start()` /
   `.finish()` exist and are exported, but **nothing in the app calls them**
   — the actual Bluetooth/mock probe measurement flow (`probe.store.ts`)
   never persists a session summary to Firestore. The `voltageSessions`
   collection is always empty in practice today, and there's no device-pairing
   registry at all (no serial-number ↔ user mapping), so "配對成功率"
   and "裝置序號" have no possible data source until that's built.
4. **No listing status field.** `marketplaceListings` has no
   active/pending/sold state, so "待審" / "已下架" / "平均上架天數" can't be
   computed — the Market page shows the full list rather than a filtered
   queue.
5. **No per-category verification quality breakdown.** The 檢驗報告品質 page
   shows real completed/needs-review/expired counts by verification type,
   but not the reference's finer "electrical/body/engine pass-attention-fail"
   split — that needs parsing every verification's `answers`/`evidence`
   subcollections against a category taxonomy, which is a nontrivial
   aggregation better done once at verification-completion time (writing a
   summary field onto the `verifications` doc) than recomputed live in the
   admin UI on every page load.
6. **Reply-rate, EV flag, odometer-anomaly are heuristics, not real fields.**
   "賣家回覆率" isn't computed at all (would need per-message analysis across
   every conversation). "疑似電動車" is a brand-name string match, not a real
   fuel-type field on `Vehicle`. "里程異常" is real — it compares a vehicle's
   own verification history for a mileage that decreased over time — but it's
   inferred, not a stored flag.

## Files

- `src/admin/` — all admin-only Vue components, services, and `admin.css`.
- `src/services/firebase/user-profile.service.ts` — shared with the mobile
  app (called from `auth.store.ts`); this is the one piece of "real app"
  code this task touched outside `src/admin/`.
- `scripts/seed-test-users.mjs` — creates/reuses the admin account (and the
  4 other fixed test accounts alongside it).
- `firestore.rules` — `isAdmin()` + the new collections' rules.
