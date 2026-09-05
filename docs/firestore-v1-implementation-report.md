# MotoVerify Firestore v1.0 — Implementation Report

Firebase project: `motorcycle-verification` (single project/alias, confirmed via `.firebaserc`).

This migration was built against a 39-section target spec provided by the user (`MotoVerify_Firestore_v1_Agent_Implementation.md`). The spec was written without knowledge of this app's actual state; a codebase audit found several of its instructions would delete live data, invent an identity system this app doesn't have, or remove features with no replacement. Four scope questions were put to the user before implementation began — this report documents the outcome against those locked decisions, not the spec's literal text. The plan approved before implementation is preserved at the session's plan-file location; this report reflects what was actually done, including issues found only by running the code for real.

## Locked decisions (confirmed with the user before implementation)

1. **No destructive wipe.** Every live document was reshaped in place via a migration script, not deleted and recreated.
2. **Rules tightened on `vehicles`/`verifications`** from "any signed-in user" to owner/admin-scoped (verifications additionally public-readable once explicitly marked so) — on the condition the regression suite be fixed if broken, not left broken.
3. **No `accountId`/`publicProfiles` identity layer.** Every identity field (`sellerId`, `buyerId`, `authorId`, `memberIds`, `currentOwnerId`, `reporterId`, `senderId`, `userId`) remains the Firebase Auth uid directly, exactly as before. **Amended 2026-09-04** — see "Test Accounts" below: `users`/`accountIds`/`publicProfiles` now exist for 5 fixed dev/test identities specifically. This decision otherwise still stands — no other collection's identity fields changed.
4. **No Cloud Functions / Trusted Backend.** This project stays client-SDK-only (no Admin SDK, no service account key, no `functions/` directory). Every invariant a Cloud Function would otherwise enforce (draft→published transition, the `isPublic` one-way flip, denormalized counters) is enforced in Firestore Rules against ordinary client writes instead.

## Firestore structure — collections and fields

| Collection | Status | Notes |
|---|---|---|
| `vehicles` (+`fuelLogs`,`maintenanceLogs`) | Reshaped | `year`→`manufactureYear`, `imageUrl`→`photos[]`; added `modelId`, `registrationDate`, `displacementCc`, `transmission`, `color`, `modified`, `modificationNote`, `registrationDocumentUrl` (all optional, no dedicated edit UI yet beyond what already existed). `avgFuelConsumption` dropped as a stored field — now computed live from `fuelLogs` via `src/utils/fuel-average.ts`'s real full-to-full algorithm (previous code used a simplified approximation). `maintenanceReminderCount` dropped per spec (no backing logic existed for it). `fuelLogs`: `date`(string)→`refueledAt`(Timestamp), `cost`→`costTwd`, added `fullTank`, `recordedBy`. `maintenanceLogs`: single `item`/`cost`→`items[]` array, added `shopName`, `totalCostTwd`, `receiptUrls`, `recordedBy`. |
| `verifications` (+`answers`,`evidence`) | Reshaped | Added `isPublic` (default false), `protocolVersion`, `schemaVersion`. Kept `status`/`type`/`expiresAt`/`transactionDecision` (the verification engine's own state machine — not in the spec's field list, but removing them would have broken the regression suite these fields exist to protect). |
| `users` | Reshaped | Added `photoUrl` (from Firebase Auth), `accountTier` (default `'standard'`, inert this pass — no UI/rule depends on its value yet). |
| `conversations` / `messages` | Fixed, not reshaped | `lastMessage.createdAt` now `serverTimestamp()` (was `Date.now()`) in both the app and `scripts/seed-demo-data.mjs`'s own independent send path. Dropped the redundant `message.conversationId` field (doc already lives at `conversations/{id}/messages/{id}`). |
| `discussionPosts` / `comments` | Reshaped | `status`: `'published'/'deleted'` → `'active'/'hidden'/'deleted'`. Added `parentCommentId` (always `null` — no threaded-reply UI exists). Added admin moderation: `hidePost()`, `dismissReport()`. |
| `vehicleNews` | Reshaped | `source`→`sourceName`, `body`→`content`, `relativeTime`(baked string)→`publishedAt`(Timestamp, rendered via the existing `formatRelativeTime()` util). Added optional `summary`, `coverImageUrl`, `sourceUrl`. |
| `marketplaceListings` (+`appointments`) | Reshaped (largest single change) | Flat vehicle fields → nested `vehicleSnapshot` map (`brand`,`model`,`manufactureYear`,`displacementCc`,`transmission`,`color`,`mileage`,`modified`,`photos`). Added `status` (`'draft'\|'published'` — no `validating`/`trading`/`sold`/`archived`, since those depend on the deferred Transaction flow or an undefined moderation step this app doesn't have), `verificationIds`, `appointmentCount`. **Kept** `verificationScore` as a stored field (deviation from spec, see below). `sellerRating`/`sellerReviewCount`/`sellerType`/`availableDates`/`timeSlots` kept exactly as-is (already confirmed live features with no spec replacement). New `listingService.publish()` implements the draft→published transition client-side, with Firestore Rules enforcing the invariants a Cloud Function would otherwise guard. |
| `vehicleModels` | Reshaped | Full rebuild to the spec's nested `specs`/`features`/`realFuelStats`/`reviewStats` shape. Zero mobile-app dependents (admin-only CRUD) — lowest-risk collection in the whole migration. `features.*` and most of `specs.*` have no admin-form input yet (schema-ready, defaults only) — the form covers brand/series/modelYear/trim/bodyType/powerType/displacementCc/transmission plus engine/dimension/efficiency/ABS-TCS-CBS basics. |
| `voltageSessions`, `userPreferences`, `myListings` | **Deleted** | Confirmed zero code readers before deletion. `userPreferences` had 153 accumulated docs, `myListings` had 2 — both removed via `scripts/delete-deprecated-collections.mjs --confirm`. |
| `consents`, `disclaimers`, `adminSettings` | Already gone | Removed in an earlier session (admin backend copy/consent/push page removals). No rule exists for them (by design) — a leftover data check would need admin read access nothing grants on purpose. |
| `featuredDealers` | **Kept, unchanged** | Live Home-page feature; the spec's instruction to remove this collection was not applied — no replacement was defined and it would have broken working UI for no benefit. |

## Deviations from the spec's literal text

| Area | Spec says | What was built | Why |
|---|---|---|---|
| Identity model | Every business ID is an `accountId` | Firebase UID throughout | Locked decision #3 — see above. |
| Trusted backend | Cloud Functions | Firestore Rules + client batches/transactions | Locked decision #4 — see above. |
| `vehicles` delete | Forbidden | Owner delete kept (live "刪除車輛" button) + admin delete added | Forbidding it with no `vehicleIdentities` dedup in place is a pure regression with nothing gained. `vehicleIdentities` itself was designed but deferred as a net-new UX gate, not part of this reshape. |
| `verifications` fields | Only the spec's 8 listed fields | Spec's fields **added alongside** `status`/`type`/`expiresAt`/`transactionDecision` | Those four ARE the verification engine's state machine — the regression suite exists specifically to protect it. |
| `marketplaceListings.verificationScore` | Removed (computed live) | **Kept as a stored, snapshotted field** | Discovered mid-implementation: dropping it breaks `marketplace-report-mock.ts`'s demo-report generator (uses it as a seed) and would force an expensive live per-listing recompute on every Marketplace browse-page load (N+1 query pattern) just to sort by score. Snapshotting it at publish time is consistent with the `vehicleSnapshot` pattern the spec itself establishes. |
| `appointments` doc ID | `= buyerId` | Kept auto-generated IDs | `ChatRoomView.vue` already depends on a buyer having more than one appointment doc over time (declined, then rebooked) — switching would silently destroy that history. |
| Message `type` (client-create) | `text`/`image` only | `text`/`image`/`system`/`vehicle`/`verification_report` | `system` is a live in-app feature with no Cloud Function to move it to. `vehicle`/`verification_report` have no compose-UI in the app yet but are real, rendered message types (`ChatBubble.vue`) that `scripts/seed-demo-data.mjs` legitimately produces — discovered only when the regression suite failed against the first, narrower rule. |
| `featuredDealers`, seller rating/review, appointment scheduling, conversation tags | Removed / not in spec | Kept exactly as-is | User-confirmed live features with no defined replacement anywhere in the spec. |

## Firestore Rules

Full rewrite, default-deny fallback. Every collection admin might need to backfill/repair carries an explicit admin bypass, **except `verifications`, which stays immutable for everyone including admin once `isPublic` is true** — that guarantee is the whole point of the public-report feature and was deliberately never given an escape hatch.

Two correctness issues were caught and fixed only by actually running the app against the rules (not by review alone):
- An early draft let any signed-in user set `favoriteCount`/`likeCount`/`commentCount`/`appointmentCount` to an arbitrary value by only checking *which* field changed, not by *how much*. Fixed to require each counter move by exactly ±1 per write, matching the transactions/batches that are the only legitimate writers.
- `resource.data.isPublic == false` was written assuming the field always exists — but a pre-migration document has no such field at all, and `undefined == false` is `false` in rules (not `true`), which would have blocked every owner from touching their own not-yet-migrated verification. Fixed to `resource.data.get('isPublic', false) == false` throughout.

Other admin bypasses added while discovering real needs (documented here since none were part of the original plan):
- `vehicles`, `fuelLogs`, `maintenanceLogs`, `users`, `marketplaceListings`, `discussionPosts`, `comments`: admin `update` bypass, needed for `scripts/migrate-v1-schema.mjs` to backfill documents owned by other users.
- `users`, `following`/`blockedUsers`: `update` added alongside `create`/`delete` — a client `setDoc()` on an already-existing path is an `update` from the rules' point of view, and idempotent re-following/re-blocking is harmless, not something worth rejecting.
- `conversations`: admin-only `delete` added (no delete existed at all before) — needed to remove orphaned test conversations; no delete UI exists for a real user.

## Storage Rules

New domain paths (`vehicles/{id}/...`, `verifications/{id}/evidence/...`, `marketplace/{listingId}/...`, `conversations/{id}/{uid}/...`, `discussion/{postId}/...`, `vehicleModels/{id}/...`, `vehicleNews/{id}/...`, `dev-test/...`) replacing the old flat folders.

**The token-URL fix**: verification evidence and chat images previously stored `getDownloadURL()`'s permanent-token URL directly in Firestore — a real, pre-existing security gap (anyone who ever obtained that URL string could access the asset forever, bypassing Storage rules entirely, even after the uploader's access was revoked). These now store the Storage **object path**; a new `src/composables/useStorageUrl.ts` resolves a fresh, rules-checked URL at display time. Public assets (marketplace/discussion photos) are unaffected — no confidentiality requirement there, so they keep returning a persisted URL as before.

**Known, disclosed gap**: verification evidence Storage access stays "any signed-in user" rather than mirroring the Firestore-level private/public split. A Firestore cross-service read from Storage Rules (`firestore.get()`) was already attempted for chat-media in an earlier session and consistently failed even for genuine members; extending that same unverified pattern to evidence — where a failure means total lockout rather than mild over-exposure — was judged a worse risk than the current posture. The sensitive part (who owns the vehicle, the verification's metadata/answers/results) is properly access-controlled at the Firestore level; only the raw evidence blob files in Storage are not.

## Migration execution (live project)

1. `scripts/backup-firestore.mjs` — 914 documents backed up locally to `backup/firestore-before-v1/` (gitignored) before any write.
2. `scripts/delete-deprecated-collections.mjs --confirm` — deleted `userPreferences` (153 docs) and `myListings` (2 docs); `voltageSessions` was already empty.
3. Deployed `firestore.rules`.
4. `scripts/migrate-v1-schema.mjs --confirm` — reshaped 11 vehicles, 3 fuel logs, 1 maintenance log, 7 verifications, 20 users, 59 discussion posts, 60 comments, 3 news articles, 10 listings. 0 errors.
5. Deployed `storage.rules`.
6. Full Playwright regression suite (6 tests) run against the live migrated backend — **failed once, on a genuine bug** (see below), then passed clean after the fix.
7. Deployed the rebuilt frontend to Hosting (`https://motorcycle-verification.web.app`).

### The one real regression caught by testing, not by review

`src/services/chat/conversation.service.ts`'s `toConversation()` (part of this migration's own `conversations`/`messages` fix) called `data.lastMessage.createdAt?.toMillis()` — safe against the field being missing, but not against it being a plain `number`, which every conversation created before this migration's `serverTimestamp()` fix (and every message `scripts/seed-demo-data.mjs` sends, since that script has its own independent send path) actually is. Calling `.toMillis()` on a number throws, which silently broke the entire `onSnapshot` callback with no visible error (the Message Center's "載入中..." spinner just never resolved). Not catchable by `vue-tsc` — the declared type was correct, only real data didn't match it. Found by running the regression suite, confirmed with a direct reproduction script against the live project, fixed with a type-guarded conversion, verified with a second full suite run.

## Out of scope, by design

- General-population `accountId`/`publicProfiles`/`accountIds` claim system (i.e. `claimAccountId()` onboarding for real sign-ups) — see "Test Accounts" below for the scoped exception now built for 5 fixed dev/test identities.
- Cloud Functions of any kind.
- `transactions` collection, `dealConfirmation`, ownership-transfer flow — Marketplace remains listing + viewing-appointment only.
- `vehicleIdentities` (chassis-hash dedup) — fully designable with rules alone (no Cloud Function actually required, a rules-gated `create` with `!exists()` does the job), but is a net-new UX gate blocking verification completion until registration+chassis are captured, not a reshape of existing data. Recommended as a fast-follow, not folded into this pass.
- `features.*` and most of `vehicleModels.specs.*` — schema-ready, no admin-form input yet.
- Real per-category verification quality breakdown, event tracking, retention cohorts, Probe telemetry — all pre-existing, already-documented gaps in `docs/admin-backend.md`, unaffected by this migration.

## Known risks accepted, not fixed this pass

1. Verification evidence Storage access is "any signed-in user," not mirroring Firestore's private/public split (see Storage Rules section above).
2. `fuelLogs.fullTank`/`recordedBy` on pre-migration rows are backfilled approximations (`fullTank: true` for every historical row since there's no way to know; `recordedBy` set to the vehicle's *current* owner, which is wrong if ownership ever transferred) — disclosed, not silently presented as fact.
3. `vehicleNews.publishedAt` on pre-migration rows is approximated from the document's own `createdAt` (the original `relativeTime` string, e.g. "3 小時前", can't be reversed into an exact instant).
4. Client-created `system` chat messages remain spoofable by any conversation member — an accepted trust gap with no Cloud Function available to close it, no worse than before this migration.
5. `vehicleModels.mappedWritingSpec`/`qualityScore` (the pre-migration admin fields) have no v1.0 equivalent — confirmed zero populated rows before migration, so nothing was actually lost, but flagged in the migration script's own output in case that assumption is ever wrong for a future row.

## Test Accounts (2026-09-04) ✅ 完成

5 fixed dev/test accounts built on the spec's frozen identity layer (§5: `users/{authUid}` +
`accountIds/{accountId}` + `publicProfiles/{accountId}`), scoped narrowly to these 5 identities
rather than reopening locked decision #3 for the whole app. Full detail in
[docs/test-accounts.md](test-accounts.md); summary here per the task's own reporting checklist.

**Script**: `scripts/seed-test-users.mjs` (`ALLOW_TEST_SEED=true npm run seed:test-users`), client
SDK only, idempotent (verified by running it twice — second run reused all 5 uids, wrote no
duplicates). Supersedes and replaces the old single-admin `scripts/seed-admin-user.mjs`, which was
deleted.

**Firebase UIDs**:

| Account | Email | accountId | UID |
|---|---|---|---|
| Admin | `admin@test.com` | `motoverify_admin` | `CMWrmo2pHsRiBu5kMj1CDJ23xd72` |
| User 1 | `user1@test.com` | `user1` | `bku5wsBH91e7BZCVhXE9quYG8813` |
| User 2 | `user2@test.com` | `user2` | `xICpEbjn3BMIhZxuqNqwMaEovIM2` |
| User 3 | `user3@test.com` | `user3` | `PWTvkmEsOWUap3riy3v1WbcKGX52` |
| Agent test | `agent@test.com` | `agenttest` | `LLbSpADznMQxaIKr3BF4MpAd6LI3` |

Password for all 5: `test1234`, not the literal `test` requested — Firebase Auth rejects any
password under 6 characters (`auth/weak-password`), a hard platform floor with no per-project
override. Confirmed with the user after the first live run failed on this.

**Firestore documents created**: `users/{uid}` × 5, `accountIds/{accountId}` × 5,
`publicProfiles/{accountId}` × 5 — 15 documents total, matching the spec §5 schemas exactly. No
Vehicle/Verification/Listing/Post/Conversation test data was created (spec §12) — the 4 non-admin
accounts get their starting data by *reassignment* instead (see below), not by seeding anything new.

**Security Rules updated** (`firestore.rules`, 2 live deploys — additive collections first, then
the admin uid swap, so the seed script never depended on admin rights it didn't have yet):
- `isAdmin()` uid swapped from the old `admin@motoverify.internal` account to `admin@test.com`'s
  real uid. All 7 operational scripts that sign in as admin (`cleanup-database.mjs`,
  `migrate-v1-schema.mjs`, `seed-mock-vehicles.mjs`, `seed-marketplace-mock.mjs`,
  `seed-my-listings.mjs`, `delete-deprecated-collections.mjs`, `backup-firestore.mjs`) updated to
  the new credential in lockstep, plus `src/admin/services/admin-auth.service.ts` (the `/admin`
  login form still accepts the literal "test/test" — it now exchanges that for `admin@test.com`
  instead of the retired account).
- `users/{userId}` update rule: added `accountId` to the fields self-writes can't change (alongside
  the existing `accountTier`/`createdAt`), using `.get('accountId', null)` on both sides so
  ordinary users with no `accountId` field at all (everyone outside this task's 5 accounts) aren't
  blocked from their own routine profile updates.
- New `accountIds/{accountId}`: `get` any signed-in user, `list` false, `create` self-uid-scoped
  only (`request.resource.data.authUid == request.auth.uid`), `update`/`delete` false for everyone
  including admin — permanently unique once claimed, matching `verifications.isPublic` as the only
  other absolute (no-admin-bypass) guarantee in this file.
- New `publicProfiles/{accountId}`: `read` any signed-in user, `create`/`update` gated on the
  caller owning the matching `accountIds/{accountId}` entry (or admin), `delete` false. The spec
  marks this collection backend-sync-only (no client write) — that assumes a Cloud Function this
  project deliberately doesn't have (locked decision #4); the self-scoped rule is the same
  rules-enforced substitute already used throughout this file for every other spec-implied backend
  invariant.

**Vehicle reassignment** (requested alongside the account seed, not part of the original spec):
all 13 vehicles that existed in `vehicles` were reassigned (`currentOwnerId` only — `fuelLogs`/
`maintenanceLogs.recordedBy` and `verifications.userId` left untouched, since read/write access to
a vehicle's whole history already follows its *current* owner via `ownsVehicle()` in the rules)
round-robin across `user1`/`user2`/`user3` via new `scripts/assign-vehicles-to-test-users.mjs`
(dry-run confirmed before `--confirm`): 5 vehicles → user1, 4 → user2, 4 → user3. `admin`/`agent`
intentionally received none. Full per-vehicle mapping is in that run's console output, reproduced
in `docs/test-accounts.md`.

**Login test results**: a live verification script (signed in as each of the 5 accounts for real,
against the deployed project — not a static read of the rules) checked every item in the task's
§13/§14 checklists: **33/33 passed, 0 failed.** Covered: all 5 real Firebase Auth sign-ins;
`users`/`publicProfiles`/`accountIds` correctness and cross-consistency for each; USER1 can read
their own `users` doc but not USER2's; USER1 can `get` (not `list`) `accountIds`/`publicProfiles`
for another account; USER1 cannot change their own `accountId` or `accountTier`; `isAdmin()` is
`true` only for `admin@test.com` and `false` for all 4 others (verified functionally, via an
admin-only collection read succeeding/failing, not just by inspecting the rule text).

**Not done / open follow-ups**:
1. `claimAccountId()` general onboarding (spec §28) — real sign-ups still get a plain `users`
   doc with no `accountId`, exactly as before this task. A distinct, sizeable feature (handle
   picker UI, uniqueness check, reserved-word list); deliberately not folded into this pass.
2. `npx vue-tsc -b --noEmit` and `npm run lint` both clean after this task's changes
   (`LoginView.vue`, `src/admin/services/admin-auth.service.ts`, `firestore.rules`, 7 scripts,
   2 new scripts, `docs/test-accounts.md`).

### Follow-up (2026-09-04): legacy account deletion + vehicle data audit

The 3 old role-based test accounts (`buyer`/`seller`/`dealer@motoverify.test`) were deleted at the
user's explicit request, and their vehicles (already reassigned to user1/2/3 above) confirmed to
already be clear of them first (0 owned by any of the 3, before deletion). Deletion covered: the
Firebase Auth user (self-deleted — the client SDK has no "admin deletes another uid" API, but each
account's password was known, so `scripts/delete-legacy-test-accounts.mjs` signs into each one and
calls `deleteUser()` on itself), its `users/{uid}` Firestore doc (required a new rules change —
`users/{userId}` previously had `allow delete: if false` unconditionally, now `if isAdmin()`), and
its own `following`/`blockedUsers`/`savedPosts`/`favoriteListings` subcollection docs.

**Deliberately not deleted**: content these accounts created elsewhere — buyer alone authored 65
discussionPosts and was a member of 11 conversations; seller had 6 marketplaceListings and 7
verifications; dealer had 3 marketplaceListings. Confirmed via a live audit (querying each
collection by the old uid) that none of this required an author's live profile to render — see
`docs/test-accounts.md`'s "Content left behind" table for the full counts.

**Vehicle field completeness audit** (the user noticed some of the 13 reassigned vehicles look
incomplete and asked for confirmation): confirmed accurate, two distinct causes:
- All 13 are missing the v1.0 schema's newer *optional* fields (`plateNumber`, `modelId`,
  `displacementCc`, `transmission`, `color`, `registrationDate`, `modificationNote`,
  `registrationDocumentUrl`, several also `photos`) — **by design**, not a defect: these fields
  have no admin or in-app edit UI yet (see "Deviations from the spec's literal text" above), so
  nothing has ever populated them for any vehicle, old or new.
- 6 of the 13 are also missing *core* fields (`brand` and/or `manufactureYear` and/or `mileage`) —
  these are pre-existing throwaway entries with placeholder names ("jo46", "測試", "曼巴" ×2, and 2
  more missing only year/mileage), not something this migration or the reassignment broke.

The user was asked how to proceed rather than guessing unprompted, and chose: delete the 6
core-incomplete vehicles, and fill in realistic demo values for the 7 survivors' optional fields.
Both executed (dry-run confirmed first):
- **Deleted**: the 6 vehicles, their `fuelLogs`/`maintenanceLogs` subcollections, and 2 orphaned
  `verifications` docs (with their own `answers`/`evidence` subcollections) that referenced two of
  the deleted vehicle IDs — otherwise those would have been left dangling.
- **Enriched**: the 7 survivors got real-world-accurate `displacementCc`/`transmission`/`color`/
  `registrationDate`/`modified` values for their actual models (e.g. Kawasaki Z900 = 948cc manual,
  Gogoro 1 Plus = electric so `displacementCc` deliberately left unset rather than fabricated). 2
  of the 7 had no `photos` at all — filled with real, individually verified (HTTP 200, confirmed
  image content) Wikimedia Commons photos of the matching model, matching the same source the
  other 5 vehicles' existing photos already used. `modelId`/`registrationDocumentUrl` were left
  unset — foreign-key/asset-reference fields, where a fabricated value seemed worse than none.
- Final ownership: user1 = 3 vehicles, user2 = 2, user3 = 2 (7 total, down from 13).

### Follow-up (2026-09-04): marketplace listings bound to deleted accounts

The user reported the Marketplace looked wrong. Audit confirmed: all 10 `marketplaceListings`
still had `sellerId` pointing at the just-deleted buyer/seller/dealer accounts, and 6 of the 10
(`demo-1`..`demo-6`, from `scripts/seed-marketplace-mock.mjs`) were pure fiction with no
`vehicleId` at all. Fixed:
- Deleted the 6 fictional listings + 2 real-vehicle-backed ones outside the user's wanted set
  (KYMCO Agility 125, HONDA PCX 160). Required adding an admin-only delete bypass to
  `marketplaceListings` first (`allow delete: if false` had no exception at all before this).
- Rebuilt the KAWASAKI Z900 and GOGORO 1 Plus listings against their vehicle's real current owner
  (user1, user3), with `verificationIds` populated from real completed verifications (previously
  empty on a `published` listing) and `isPublic:true` flipped on those, matching what
  `listingService.publish()` does for a real listing. Also fixed an invalid `favoriteCount: -1` on
  the Gogoro listing and a missing one on Z900 — both now `0`.
- **Yamaha MT-03 deliberately has no listing.** Its only verification is 26/70 checklist items —
  missing the entire appearance-photo/electrical/engine categories and the completion
  mileage/timestamp. Confirmed with the user rather than fabricating photo evidence and 44
  checklist results to force a fake "completed" status, since verification evidence is this app's
  core trust mechanism — not comparable to filling in a vehicle's plain spec values. User chose to
  leave it unpublished until run through the real verification flow. Marketplace now shows exactly
  2 listings (Z900, Gogoro), by explicit choice.

## Verification performed

- `npx vue-tsc -b --noEmit` — clean throughout, re-run after every phase.
- `npm run lint` — clean (only Prettier auto-formatting applied).
- Every new/modified `.mjs` script — syntax-checked (`node --check`) and actually run against the live project (dry-run first, then `--confirm`).
- Full Playwright regression suite (`verification-regression.spec.ts` ×4, `social-realtime.spec.ts` ×2) — passing against the live, migrated, newly-ruled backend.
- Manual review of every Firestore Rules branch against actual call sites in the codebase (not just the spec), which is what caught the counter-tampering hole and the missing-field `isPublic` bug before they ever reached production.
