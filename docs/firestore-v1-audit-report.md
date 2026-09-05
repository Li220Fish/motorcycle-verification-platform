# MotoVerify Firestore v1.0 Audit

**Audit Date:** 2026-09-04
**Firebase Project:** `motorcycle-verification` (project number `232449828934`) — the **only** Firebase project this app is configured against. There is no separate dev/staging project; `.firebaserc`'s only alias (`default`) and the app's own `.env` (`VITE_FIREBASE_PROJECT_ID=motorcycle-verification`) point at the same live project this audit inspected.
**Firebase CLI Account:** `li220fish@gmail.com`
**Functions region:** N/A — no `functions/` directory, no `firebase-functions`/`firebase-admin` dependency anywhere in the repo. This project is 100% Firebase client-SDK.
**Firestore database:** `(default)`
**Storage bucket:** `motorcycle-verification.firebasestorage.app`
**Auditor:** Claude (automated audit — 6 parallel code/rules research agents, one direct read-only production Firestore inventory, and 25 dynamic security-rule tests executed against the real `firestore.rules` inside a local Firebase Emulator, fully isolated from production)

## Executive Summary

| | Count |
|---|---|
| PASS | 88 |
| WARNING | 27 |
| FAIL | 18 |
| **CRITICAL** | **2** |

**Overall: NOT READY**

This app went through a real, disciplined Firestore v1.0 migration (`docs/firestore-v1-implementation-report.md`) that already discloses most of the gaps below — this audit independently re-verified them against live rules, live data, and real code rather than trusting that report's prose. The security **fundamentals** are genuinely solid: default-deny works, vehicle/verification privacy boundaries hold up under live dynamic testing, public-verification enumeration is blocked, counters are tamper-resistant, ownership can't be forged by a client. But two live, reproducible security gaps and 18 functional/schema deviations from the target spec — several of them (Cloud Functions, `accountId` identity layer, `transactions`, `vehicleIdentities`, `dealConfirmation`) whole features that were deliberately scoped out — mean this is **not** a clean v1.0 freeze candidate as literally specified.

The 2 CRITICAL findings are both live-exploitable, confirmed by actually running the operation (against production for reads, against an isolated local emulator running the real rules for the write/forge attempts):
- **CRITICAL-01**: any conversation member can forge a `type:'system'` chat message with arbitrary text (e.g. a fake "seller confirmed payment" notice) — confirmed by reproducing it.
- **CRITICAL-02**: verification evidence in Cloud Storage is readable/writable by **any signed-in user**, not just the vehicle owner/admin — Firestore-level privacy on a private verification does not extend to its evidence files.

---

## 1. Firebase Environment

| Item | Value |
|---|---|
| Project ID | `motorcycle-verification` |
| Project Alias | `default` (only alias in `.firebaserc`) |
| CLI Account | `li220fish@gmail.com` |
| Functions region | N/A (no Cloud Functions exist) |
| Firestore database | `(default)` |
| Storage bucket | `motorcycle-verification.firebasestorage.app` |

**Confirmed: the project this audit inspected is the exact same project the app ships against** — `.env`'s `VITE_FIREBASE_PROJECT_ID` and `.firebaserc`'s default alias both resolve to `motorcycle-verification`. This audit read live production data directly (read-only), not an emulator snapshot, for every "live" figure quoted below.

**WARNING — no environment separation.** There is no dev/staging Firebase project at all; "production" and "development" are the same live project. Live evidence: `users` contains 35 documents, but only 5 are the intentional fixed test accounts (`docs/test-accounts.md`) — the other 30 are throwaway accounts created by `tests/e2e/*.spec.ts` runs against this same live project (e.g. `regress-buyer-1788517094729@example.com`, created the same day as this audit). The Playwright regression suite has no emulator target configured and creates real Firebase Auth users + Firestore docs in production on every run.

---

## 2. Collections Inventory (live, read-only, signed in as the seeded admin account)

Read directly from production. No writes were performed against production at any point in this audit.

| Collection | Docs | Notes |
|---|---|---|
| `users` | 35 | 5 intentional + 30 regression-test noise (see §1) |
| `publicProfiles` | 5 | |
| `accountIds` | *(list denied by design — `allow list: if false`)* | Per-doc `get()` on all 5 known ids succeeded and cross-checked correctly (§7) |
| `vehicles` | 7 | Matches `docs/test-accounts.md`'s post-cleanup count exactly |
| `verifications` | 7 | |
| `marketplaceListings` | 2 | Matches docs |
| `transactions` | *(unreadable — no rule permits read for anyone, including admin)* | Consistent with "feature doesn't exist" |
| `vehicleModels` | 0 | |
| `vehicleNews` | 3 | |
| `discussionPosts` | **0** | **See §2a — contradicts documentation** |
| `discussionReports` | 0 | |
| `conversations` | 14 | |
| `featuredDealers` | 4 | Deprecated collection, still live (§4) |
| `voltageSessions`, `consents`, `disclaimers`, `adminSettings`, `userPreferences`, `myListings` | *(unreadable — no rule at all, not even for admin)* | Cannot be independently re-verified this session; see §8 limitations |

Subcollections (`fuelLogs`, `maintenanceLogs`, `answers`, `evidence`, `appointments`, `comments`, `likes`, `favoriteListings`, `following`, `savedPosts`, `blockedUsers`, `messages`, `fuelReports`, `reviews`) could not be enumerated via an unfiltered `collectionGroup()` scan — Firestore's list-validator rejects a broad collection-group query when the underlying rule depends on a per-document ancestor lookup (`ownsVehicle(vehicleId)`, etc.), regardless of the admin branch. This is expected behavior (it's the same protection that blocks enumeration elsewhere), not a bug, but it means subcollection document counts in this report come from targeted per-parent reads and code-path analysis, not a single global count. See §8.

### 2a. Documentation vs. live data mismatch — `discussionPosts`

`docs/test-accounts.md` explicitly states, about the deleted legacy accounts: *"None of this was deleted"* and quotes 65+8+4=77 discussion posts still attributable to them. **Live production `discussionPosts` has 0 documents.** Two untracked files present at the very start of this audit session — `scripts/_scratch-audit-discussion.mjs` and `scripts/_scratch-clear-discussion.mjs` — strongly suggest a discussion-data clear operation was run at some point that the documentation was never updated to reflect. **Both files, and this audit's own temporary read-only inventory script, disappeared from disk during this audit session without this agent deleting them** — file timestamps show `scripts/delete-legacy-test-accounts.mjs` was also re-saved during this session. This is very likely a **separate, concurrent Claude Code session or process operating on this same repository at the same time**, not an action taken by this audit's own (explicitly read-only-instructed) subagents, none of which reported writing or deleting anything. **Flagging this to you directly: if you did not intend concurrent sessions to be touching this repo, verify what else may be running.** Practical effect on this report: `docs/test-accounts.md`'s discussion-content counts are stale and should not be trusted as current state.

---

## 3. Deprecated Collections

| Collection | Firestore | Code Reference | Rules Reference | Result |
|---|---|---|---|---|
| `voltageSessions` | Unreadable (no rule); believed 0 per prior migration, **not independently re-verified this session** | **FOUND** — `src/services/firebase/voltage-session.service.ts` still exists; `src/admin/services/admin-data.service.ts:230` and `src/admin/sections/OverviewSection.vue:65,104` still query it live | Absent (correctly falls to default-deny) | **FAIL** — code wasn't fully removed even though data/rules were |
| `userPreferences` | Unreadable; believed deleted | Dead references only (deletion-tooling comments) | Absent | PASS |
| `myListings` | Unreadable; believed deleted | Dead references only | Absent | PASS |
| `consents` | Unreadable | Comment only | Absent | PASS |
| `disclaimers` | Unreadable | Comment only | Absent | PASS |
| `adminSettings` | Unreadable | None found | Absent | PASS |
| `featuredDealers` | **4 live docs**, actively read on the Home page | **Actively used** — `home-content.service.ts`, seed scripts | **Present**: `allow read, write: if signedIn();` — any signed-in user, not just admin, can overwrite it | **FAIL** — spec's §4 list explicitly says this collection should not exist in v1.0; kept as a disclosed, deliberate decision (real live feature, no replacement designed), but still a literal deviation, and the rule itself is the loose "any signed-in user" pattern §43 warns about (low impact: home-page dealer directory only, not core user data) |
| `marketplaceListings/{id}/favorite` | N/A | Not referenced anywhere | Absent | PASS — sole favorite source is `users/{uid}/favoriteListings` (§25) |

---

## 4. Authentication / Users

Live sample (`users/<regression-test-uid>`):
```json
{ "uid": "...", "displayName": null, "photoUrl": null, "updatedAt": "...", "email": "...", "createdAt": "...", "lastSeenAt": "...", "accountTier": "standard" }
```

| Field | Expected | Actual | Verdict |
|---|---|---|---|
| `accountId` | string | present only for the 5 fixed test accounts; absent (not even `null`) for all 30 other users | WARNING — by design, general `claimAccountId()` onboarding was never built (disclosed) |
| `email`, `displayName`, `photoUrl`, `accountTier`, `lastSeenAt`, `createdAt` | required | present | PASS |
| `region` | `string \| null` | present (`null`) only for the 5 fixed accounts; not written at all for ordinary sign-ups | WARNING |
| `uid` (deprecated, doc ID already carries this) | must not exist | **present on every user doc** — `user-profile.service.ts:32` (`touchUserProfile` writes `uid` into the doc body on every sign-in) | **FAIL** |
| `updatedAt` | not in target field list | present, written on every `touchUserProfile()` call | WARNING (harmless, undocumented) |
| `currentRole`, `accountType`, `defaultRole` | must not exist | confirmed absent, both in code and in every live sample checked | PASS |

---

## 5. Business User-ID References (`sellerId`/`buyerId`/`userId`/`currentOwnerId`/`memberIds`/`authorId`/`reporterId`/`senderId`)

**FAIL — the single largest architectural deviation from the target spec, but a disclosed, deliberate one ("locked decision #3" in the implementation report).** Every business-identity field across the entire app is the raw Firebase Auth UID, not a MotoVerify `accountId`. Confirmed directly in live data, not just code:

- `vehicles/9w2z.../currentOwnerId` = `bku5wsBH91e7BZCVhXE9quYG8813` (28-char Firebase UID)
- `verifications/MysL.../userId` = `C4Rn3b9vpoXn2mRoL8WJUnFOg9k1`
- `marketplaceListings/SaQH.../sellerId` = `bku5wsBH91e7BZCVhXE9quYG8813`
- `conversations/*/memberIds` = array of Firebase UIDs (e.g. `["e399kAhI9PNTmC2RqRT3K6tdiRq1","C4Rn3b9vpoXn2mRoL8WJUnFOg9k1"]`)
- `discussionReports/*/reporterId` — same pattern (code-confirmed)

The `accountId`/`accountIds`/`publicProfiles` layer exists **only** for the 5 fixed dev/test identities (§7–9 below) — it is not wired into any of the identity fields above for the other 30 real users. This is architecturally consistent throughout (no partial/inconsistent state was found), and arguably no *less* secure than an `accountId` layer would be (Firebase UIDs are unguessable, auth-backed identifiers) — but it is a literal, wholesale deviation from the spec's identity model.

---

## 6. `accountIds`

| Check | Result |
|---|---|
| Schema `{authUid, createdAt}` | PASS — confirmed exact on all 5 live docs |
| `users.accountId` ↔ `accountIds.authUid` mapping, both directions | **PASS** — live-verified for all 5: `motoverify_admin→CMWrmo2...`, `agenttest→LLbSp...`, `user1→bku5w...`, `user2→xICpE...`, `user3→PWTvk...`, every one matches with no reversed/duplicate mapping |
| `list` forbidden (no enumeration) | PASS — `allow list: if false` confirmed, and confirmed dynamically that per-account `get()` still works |
| A client can create `accountIds/{x}` pointing at *someone else's* uid | **DENIED** — confirmed dynamically in the emulator against the real rule | PASS |

---

## 7. `publicProfiles`

| Check | Result |
|---|---|
| Schema exactly `{accountId, displayName, photoUrl, accountTier}` | PASS — confirmed on all 5 live docs, **no `email`/`region`/`authUid`/license fields present** |
| `users` / `publicProfiles` / `accountIds` 3-way consistency | PASS — live-verified for all 5 |
| Create without owning the matching `accountIds` claim | **DENIED** — confirmed dynamically | PASS |

---

## 8. The 5 Fixed Test Accounts

All 5 (`admin@test.com`/`user1@test.com`/`user2@test.com`/`user3@test.com`/`agent@test.com`) confirmed **live** in Firebase Auth, `users/{uid}`, `accountIds/{accountId}`, `publicProfiles/{accountId}`, correctly cross-mapped, **all 5 including admin have `accountTier: "standard"`** — PASS on every checklist item.

**WARNING** — the documented password is `test1234`, not the literal `test` originally requested; unavoidable (`auth/weak-password`, Firebase's hard 6-character floor). Disclosed and justified in `docs/test-accounts.md`.

---

## 9. Admin Permission Model

```js
function isAdmin() {
  return signedIn() && myUid() == 'CMWrmo2pHsRiBu5kMj1CDJ23xd72';
}
```

- Hardcoded to a single uid (`admin@test.com`'s real Firebase UID), **not** `accountTier=='admin'` — confirmed in rules text and confirmed dynamically (only that exact uid passed admin-gated operations in the emulator test run; the `test1234`-registered `user1`/`user2`/`user3`/`agenttest` accounts do not and cannot). PASS.
- Grepped `accountTier` across the whole codebase: every use either freezes the field against self-edits or defaults it to `'standard'` for display — zero code paths branch admin-equivalent access on its value. PASS.

---

## 10. Vehicle Schema

Live `Vehicle` type fields: `id, currentOwnerId, modelId, brand, model, manufactureYear, mileage, registrationDate, displacementCc, transmission, color, modified, modificationNote, licensePlate, engineNumber, chassisNumber, photos, registrationDocumentUrl, sortOrder, createdAt, updatedAt` — all spec-required fields present. PASS on the core field set.

**Live data cross-check across all 7 production vehicle documents** (this is the one area where live data diverges from what the code/type analysis alone would suggest):

| Old field | Spec says | Live reality | Verdict |
|---|---|---|---|
| `year` | removed → `manufactureYear` | Code confirmed not read anywhere — **but still physically present as a stale key on 6 of 7 live vehicle documents** (never stripped when the doc was reshaped) | WARNING — dead data, zero functional impact, incomplete migration cleanup |
| `imageUrl` | removed → `photos[]` | Same pattern — **stale on 5 of 7 live documents** | WARNING |
| `avgFuelConsumption` | dropped, computed live | **Stale on 3 of 7 live documents** even though code now computes it live and never reads the stored value | WARNING |
| `maintenanceReminderCount`, `ownershipHistory` | dropped | Confirmed absent from all 7 live documents and all code | PASS |
| `updatedAt`, `sortOrder` | not in spec's 18-field target list | Present on the type and written on every create/update | WARNING — undisclosed additions (harmless — audit metadata / manual-reorder feature) |

**Vehicle privacy boundary (§11–12) — dynamically tested, not just read from rules text:**

| Test | Expected | Actual | How verified |
|---|---|---|---|
| Non-owner `get` on private vehicle | DENY | DENY | Live-run in emulator against real `firestore.rules` |
| Admin `get` on any vehicle | ALLOW | ALLOW | Same |
| Owner attempts `updateDoc(vehicle, {currentOwnerId: otherUid})` | DENY | DENY | Same — client cannot forge ownership transfer |

**FAIL** — there is no trusted ownership-transfer flow at all (no `transactions` collection, no `finalizeTransaction`). The only place `currentOwnerId` is ever reassigned post-creation is a one-off admin migration script, not an app feature. Disclosed, deliberate scope cut ("Marketplace remains listing + viewing-appointment only").

---

## 11. `vehicleIdentities`

**FAIL** — does not exist in any form. No SHA-256/hash-based chassis dedup anywhere in code, no collection, no rule. `chassisNumber` is a plain optional string with zero uniqueness enforcement. Confirmed via full-repo grep for `sha256`/`createHash`/`crypto.subtle.digest` (zero hits) and for `vehicleIdentities` (zero hits outside the implementation report's own "deferred" disclosure).

---

## 12. `fuelLogs` / `maintenanceLogs`

| Item | Verdict |
|---|---|
| `FuelLog` fields (`refueledAt,mileage,liters,costTwd,fullTank,note,recordedBy,createdAt`) | PASS — exact match |
| `MaintenanceLog` fields (`servicedAt,mileage,items[]{type,name,costTwd},shopName,totalCostTwd,note,receiptUrls[],recordedBy,createdAt`) | PASS |
| Old fields `date`/`cost` (fuel), `date`/`item`/`cost` (maintenance), and the typo'd `vechicleId`/`createAt` | PASS — confirmed absent everywhere |
| `recordedBy` = the recording user's own Firebase Auth uid | PASS (though per §5, this is a uid not an `accountId` — same architecture-wide deviation, not counted separately) |
| Undisclosed `vehicleId` field also stored on every log doc | WARNING — harmless denormalization, not in the spec's field list, never mentioned in the migration report |

---

## 13. Verification Schema

Live sample:
```json
{ "protocolVersion": 1, "completedAt": "...", "type": "seller", "mileage": 9800, "createdAt": "...", "isPublic": true, "userId": "...", "status": "completed", "vehicleId": "...", "schemaVersion": 1 }
```

All spec fields present (`vehicleId, userId, relatedVerificationId, mileage, protocolVersion, schemaVersion, isPublic, createdAt`) — PASS. `relatedVerificationId` is genuinely implemented (buyer-verification comparison flow), not just declared — PASS.

**FAIL vs. spec §16** ("不得再依賴 type/status/updatedAt/completedAt/visibility") — the app's verification engine still fully depends on `status`, `type`, `completedAt`, and `expiresAt`/`transactionDecision` as its real state machine; these are the fields the regression suite protects. Disclosed, intentional — removing them would break the working verification flow with no replacement designed.

---

## 14. Verification Security — dynamically tested against the real rules

This is the single most important security guarantee in the app, and it holds up under an actual reproduced attack, not just rules-text reading:

| Test | Expected | Actual (emulator, real `firestore.rules`) |
|---|---|---|
| Owner `get` own private verification | ALLOW | **ALLOW** |
| Other user `get` someone else's private verification | DENY | **DENY** |
| Other user `get` a known-id **public** verification | ALLOW | **ALLOW** |
| Other user runs `query(where('isPublic','==',true))` to enumerate public verifications | **DENY** | **DENY** — confirmed: broad enumeration is blocked even though single-doc `get` isn't |
| Owner flips their own still-private verification `isPublic: false→true` | ALLOW (one-time) | **ALLOW** |
| Owner attempts to edit the verification *after* it's public | DENY | **DENY** |
| **Admin** attempts to edit the verification after it's public | DENY (no admin escape hatch) | **DENY** — confirmed even the trusted admin account can't undo the public-freeze |
| Create an `answers` doc under a now-public (frozen) verification | DENY | **DENY** |

**PASS across the board** — Known-ID read works, global browse/enumerate does not, and public-report immutability is absolute (including against admin). This is exactly the behavior sections 17–18 require.

---

## 15. Answer / Evidence Schema

| Item | Expected | Actual | Verdict |
|---|---|---|---|
| Answer fields | `itemId,result,note,aiResult,createdAt` | `itemId,result,note?,cannotCheckReason?,formData?,updatedAt` — **`aiResult` does not exist anywhere in the codebase** | **FAIL** |
| Answer `result` enum | `normal\|attention\|unsure\|not_applicable\|cannot_check` | Exact match | PASS |
| AI writing into `note`? | must never happen | Confirmed it doesn't — AI/recognition findings only ever land in `evidence.metadata`, never in `answer.note` | PASS |
| Evidence fields | `itemId,type,remoteUrl,createdAt` | Present, plus extras (`captureSource`, `metadata`, etc.) | PASS |
| Evidence `type` enum | `photo\|video\|audio\|voltage\|manual\|document` | Actual union **omits `'document'`** — the document-capture component writes `type:'photo'` instead, stashing `evidenceKind:'document'` only in metadata | **FAIL** |
| Voltage evidence via `type:'voltage'` + `remoteUrl→JSON` | required shape | Voltage readings are stored inline in `metadata` (`{label,voltage,mode,sampleCount}`) — no `remoteUrl`, no JSON blob, and correctly **not** resurrecting the deleted `voltageSessions` collection | WARNING — deviates from the spec's shape, but doesn't reopen the deprecated flow |

---

## 16. Marketplace Listing

Live sample confirms `verificationScore`, `sellerRating`, `sellerReviewCount`, `sellerType`, `availableDates`, `timeSlots` all still present on real published listings — **FAIL vs. spec's explicit deprecated-field list**, disclosed/intentional (kept to avoid breaking a live feature with no designed replacement). No `imageUrl`, no singular `verificationId`, no duplicated vehicle fields outside `vehicleSnapshot` — PASS on those.

### `vehicleSnapshot` privacy boundary — the CRITICAL-severity check in this section is clean

Checked against **both** live published listings in production:

```
snapshotKeys=["transmission","manufactureYear","modified","color","brand","displacementCc","photos","mileage","model"]
FORBIDDEN_IN_SNAPSHOT=[]
```

**PASS** — `licensePlate`, `engineNumber`, `chassisNumber`, `registrationDocumentUrl`, `currentOwnerId` are absent from both real `vehicleSnapshot`s, and the code that builds it (`listing.service.ts`) only ever copies the 9 allowed fields. No private-data leak into public marketplace listings.

**FAIL — listing lifecycle.** Only `draft`/`published` exist anywhere in code or rules; `validating`/`trading`/`sold`/`archived` don't exist at all (no `transactions` flow to support them). Disclosed scope cut.

**WARNING** — `listing.service.ts`'s own `publish()`/`create()` functions perform **zero internal validation** of `verificationIds.length>=1` or the vehicleId/sellerId↔verification match; correctness today depends entirely on `firestore.rules` plus the one UI call site's careful construction (`MyListingsView.vue`). A second call site (e.g. a future admin tool) would have no code-level guardrail, only the rules layer. `isPublic` does correctly flip to `true` as part of publish (confirmed live: both published listings' linked verifications show `isPublic:true`).

Confirmed: a client **cannot** skip `draft` and write `published` directly — `create` requires `status:'draft'`; the only path to `published` is the one guarded `update` rule requiring `verificationIds.size()>=1`. PASS.

---

## 17. Favorite / Appointment

| Item | Verdict |
|---|---|
| Sole favorite source is `users/{uid}/favoriteListings/{listingId}`, fields `{listingId, createdAt}` | PASS |
| `marketplaceListings/{id}/favorite` unused | PASS |
| `favoriteCount` tamper attempt (`+99999`) | **DENIED** — dynamically confirmed | PASS |
| `favoriteCount` legitimate `+1`-only diff | **ALLOWED** — dynamically confirmed | PASS |
| `favoriteCount +1` bundled with another field change (should still deny) | **DENIED** — dynamically confirmed | PASS |
| Appointment fields (`buyerId,scheduledAt,status,createdAt`) | PASS |
| Appointment doc ID = auto-generated, not `buyerId` | WARNING — disclosed deviation, no security consequence (access control is field-based, not doc-id-based); preserves rebooking history a `buyerId`-keyed doc would destroy |
| No `completed` status anywhere | PASS |
| Seller `pending→approved` | **ALLOWED** — dynamically confirmed | PASS |
| Seller `approved→pending` (invalid) | **DENIED** — dynamically confirmed | PASS |

---

## 18. Transactions

**FAIL** — `finalizeTransaction()` and the whole ownership-transfer/deal-completion flow are entirely unimplemented; zero references to `transactions`, `dealConfirmation`, or `finalizeTransaction` anywhere in `src/` or `scripts/`. Disclosed scope cut (this project has no Cloud Functions at all, and this flow was explicitly deferred).

The narrower security question the spec asks — **can a client forge a transaction anyway?** — is cleanly answered: **no**. Dynamically confirmed: `setDoc()` into `transactions/{anything}` is denied (no rule matches it; falls to default-deny). PASS on that specific check, even though the feature itself doesn't exist.

---

## 19. Conversations / Messages / Chat Security

Live sample: `memberIds` (exactly 2 uids), `unreadCounts`, `lastMessage`, `lastMessageAt`, `context.listingId` (nested, optional — not top-level as spec wants), `tag` (a real, actively-used field not in spec, e.g. `"買家詢問"`). **`dealConfirmation` is completely absent from all 14 live conversations** — FAIL, disclosed scope cut (§18).

**Dynamically tested against the real rules:**

| Test | Expected | Actual |
|---|---|---|
| Non-member `get` on a conversation | DENY | **DENY** |
| Member creates a `type:'text'` message | ALLOW | **ALLOW** |
| Member updates an existing message | DENY | **DENY** |
| Member deletes an existing message | DENY | **DENY** |
| `memberIds` update by a member | DENY (immutable after create) | DENY (rules text: update requires `memberIds` unchanged) |

### CRITICAL-01 — a conversation member can forge a `type:'system'` message

```
[PASS-per-rules-text, but this is the finding] Member creates {senderId: self, type: 'system', text: '賣家已確認收款（偽造測試）', createdAt}
→ ALLOWED, confirmed by actually reproducing it in the emulator against the real firestore.rules
```

`firestore.rules` allows message `create` with `type in ['text','image','system','vehicle','verification_report']`, gated only on `senderId==caller` and conversation membership — **no gate on which `type` an ordinary member may use.** This is not theoretical: `MarketplaceListingView.vue:186` already calls `chatService.sendSystemNote()` as a normal user action when a buyer books a viewing appointment, and `sendSystemNote()` is a thin, unvalidated wrapper any signed-in member can call with **arbitrary free text** — not restricted to the booking template. In a marketplace app where chat is the venue for negotiating and confirming real-money vehicle sales, any buyer or seller can fabricate a system-looking message (e.g. impersonating a "payment confirmed" or "verification approved" system notice) to the other party. See the full write-up under §21.

---

## 20. Discussion Posts / Comments / Likes / Reports / Following / Saved / Blocked

| Item | Verdict |
|---|---|
| `discussionPosts` fields (`authorId,title,body,category,media[],likeCount,commentCount,status,createdAt,updatedAt`) | PASS (richer `media[]` shape than spec's `mediaUrls`, acceptable superset) |
| `status` enum `active/hidden/deleted`, confirmed **no hard delete** (`softDeletePost`/`deleteComment` only ever `updateDoc({status:'deleted'})`) | PASS |
| `comments` fields (`authorId,text,parentCommentId,status,createdAt`) | PASS |
| `discussionPosts/{id}/likes/{uid}` — key is the Firebase uid (consistent with §5's app-wide pattern, not `accountId` as spec's literal path implies); self-only write enforced | PASS (functionally correct) |
| `discussionReports` fields exact match (`reporterId,targetType,targetId,reason,status,createdAt`) | PASS |
| `targetType` enum has an extra `'user'` value beyond `post/comment` | WARNING (superset, harmless) |
| Regular user: create ALLOW, read/update/delete own report DENY | **PASS — dynamically confirmed** (reporter cannot read back their own report) |
| Admin: read ALLOW | **PASS — dynamically confirmed** |
| `following/{uid}` field is literally `targetUid`, not spec's `targetUserId` | WARNING (cosmetic) |
| `blockedUsers/{uid}` fields are `blockedUid`+`createdAt`, not spec's `blockedUserId`+`blockedAt` | WARNING (cosmetic) |
| `savedPosts` fields `{postId, savedAt}` | PASS — exact match |
| `following`/`blockedUsers` are readable by **any** signed-in user, not just the owner | WARNING — disclosed rationale (mutual block-check needs both directions readable), low-sensitivity data (who follows/blocks whom), not the owner-only isolation spec asks for |

---

## 21. `vehicleModels` / `fuelReports` / `reviews` / `vehicleNews`

| Item | Verdict |
|---|---|
| `vehicleModels` doc ID = random auto-ID, not a model-year/trim slug (e.g. `sym_mmbcu_2026_158_tcs`) | **FAIL** — every model-year/trim variant would collide into whatever the admin re-enters through the same free-text fields, no versioning/uniqueness at all |
| Core fields (`brand,series,modelYear,trimName,bodyType,powerType,displacementCc,transmission`) | PASS |
| `coverImageUrl`/`photos` | always empty, no upload UI | WARNING (schema-ready, unpopulated) |
| `specs{}`/`features{}` | mostly defaulted/null, partial admin-form coverage | WARNING |
| `vehicleModels/{id}/fuelReports` | **not implemented at all** — zero reader/writer code | **FAIL** |
| `vehicleModels/{id}/reviews` | **not implemented at all** — zero reader/writer code; even if it were, the admin-only write rule would block a real verified owner from posting one | **FAIL** |
| `vehicleNews` fields | `createdAt` **entirely missing** from both type and write path | **FAIL** |
| `vehicleNews.category` | spec wants a 6-value English enum (`new_model/maintenance/regulation/market/safety/motoverify`) | **Unconstrained free-text Chinese** (`'政策'`, `'新車'`, `'安全'`) — no enum/type exists anywhere in code | **FAIL** |
| Read: any signed-in user; Write: admin-only | PASS |

---

## 22. Firestore Rules — Default Deny, Helper Functions, List vs. Get

| Item | Verdict |
|---|---|
| Final `match /{document=**} { allow read, write: if false; }` fallback | **PASS** — confirmed present, and confirmed the *only* remaining broad grant on any core collection is `featuredDealers` (§3, low-sensitivity) |
| No blanket `allow read, write: if request.auth != null` on `vehicles`/`verifications`/`answers`/`evidence` | PASS — confirmed absent, replaced with owner/admin/public-flag-scoped rules |
| Helper functions (`signedIn`, `myUid`, `isAdmin`, `ownsVehicle`, `isConversationMember`) — permission model equivalent to spec's `canReadVerification()` etc. even without matching names | PASS |
| Public verification: GET (known id) ✅ / LIST (query) ❌ | **PASS — dynamically confirmed** (§14) |
| Private vehicle: non-owner GET ❌ | **PASS — dynamically confirmed** (§10) |
| Conversation: non-member read ❌ | **PASS — dynamically confirmed** (§19) |

---

## 23. Storage Rules

### CRITICAL-02 — verification evidence is readable/writable by any signed-in user, not just the owner/admin

```
match /verifications/{verificationId}/evidence/{allPaths=**} {
  allow read, write: if request.auth != null;
}
```

This is a **disclosed** gap (the implementation report explicitly flags it: a Firestore cross-service `firestore.get()` lookup from Storage rules was attempted and "consistently failed even for genuine members," so this was left as the fallback). But per this audit's own bar — §46 explicitly names this exact pattern as the thing to fail on — it is exactly that pattern, on a genuinely sensitive path. Firestore-level privacy (private verification, owner/admin-only) does **not** extend to the actual evidence blobs (photos, videos, odometer/VIN shots) once uploaded — **any signed-in user who obtains or guesses a Storage path can read or overwrite another user's private evidence files**, completely bypassing the Firestore-level access control this report otherwise verified works correctly. Grading this **CRITICAL** rather than FAIL because it is a genuine cross-user data-exposure vector on content the rest of the system correctly treats as private.

| Path | Rule | Assessment |
|---|---|---|
| `verifications/{id}/evidence/**` | `if request.auth != null` (any signed-in user) | **CRITICAL** (above) |
| `vehicles/{id}/**` | `if request.auth != null` | WARNING — same broad grant, but currently **unused** (no upload UI writes here at all yet — reserved for a future vehicle-photo-upload feature) |
| `marketplace/{listingId}/**` | read: `true` (public), write: signed-in | PASS — correct for intentionally public content |
| `conversations/{id}/{uid}/**` | write scoped to the uploader's own uid folder | PASS — reasonable substitute given the documented cross-service lookup failure; actual message injection still requires passing Firestore's own membership-gated rule |
| `discussion/{postId}/**`, `vehicleModels/**` (read-only), `vehicleNews/**` (read-only) | appropriately scoped for public reference/social content | PASS |

### Download-URL / permanent-token audit

**PASS** — confirmed by tracing every `getDownloadURL()` call site (only 2 in the whole codebase, both inside `storage.service.ts`): verification evidence and chat images correctly store the Storage **object path**, not a permanent token URL, resolved live at display time via `src/composables/useStorageUrl.ts`. Public assets (marketplace/discussion photos) correctly keep persisted `getDownloadURL()` URLs — appropriate since nothing there needs confidentiality. No private asset (registration document, maintenance receipt) has an upload UI yet, so there's nothing populated to leak via that specific path.

**Marketplace media boundary** — PASS. Listing photos are either freshly uploaded to a new public `marketplace/{listingId}/...` path or fall back to the vehicle's own already-public `photos[]` array; there is no vehicle-photo upload UI at all, so no private asset can currently reach a public listing.

---

## 24. Cloud Functions

**None exist.** Confirmed: no `functions/` directory, no `firebase-functions`/`firebase-admin` in `package.json`. Every requested function has no server-side equivalent:

| Spec function | Status |
|---|---|
| `claimAccountId` | Not built (general onboarding) — the 5 fixed test accounts are seeded directly, not claimed through a flow |
| `syncPublicProfile` | N/A — client writes `publicProfiles` directly, rules-gated |
| `bindVehicleIdentity` | Absent (§11) |
| `submitListing`/`publishListing` | Client-SDK `listing.service.ts`, rules-gated (§16) |
| `updateFavoriteCount`/`updateAppointmentCount` | Client `runTransaction`/`writeBatch` + rules ±1 bound (§17) — atomic, tamper-resistant, confirmed dynamically |
| `getOrCreateConversation`/`updateConversationMetadata` | Client-SDK, rules-gated (§19) |
| `startDealConfirmation`/`confirmDeal` | Absent (§18) |
| `finalizeTransaction` | Absent (§18) |
| `createSystemMessage` | Exists as a client function with **no trust boundary** — this is CRITICAL-01 (§19) |
| `calculateVehicleFuelReport`/`updateVehicleModelFuelStats` | Absent (§21) |
| `createVehicleModelReview`/`updateVehicleModelReviewStats` | Absent (§21) |

Where the underlying invariant *is* enforced, it's via Firestore Rules against direct client writes (transactions/batches + delta-bounded rule guards) — verified atomic and tamper-resistant everywhere it exists. Where it doesn't exist at all, the corresponding FAIL is already counted under its own section above (not double-counted here).

---

## 25. Indexes

| Required index | Exists? |
|---|---|
| `marketplaceListings`: `status+publishedAt`, `status+region`, `status+priceTwd` | **None exist** — `firestore.indexes.json` has zero `marketplaceListings` indexes at all | WARNING |
| `discussionPosts`: `status+createdAt` | Exists | PASS |
| `discussionPosts`: `category+createdAt` | **Does not exist** (only `authorId+createdAt` and a couple of others do) | WARNING |
| `conversations`: `memberIds array-contains + lastMessageAt` | **Exists exactly as required** | PASS |

Per the audit's own instructions, missing indexes are WARNING, not FAIL — and no large index build was performed this round.

---

## 26. Security Test Matrix (dynamically executed — real `firestore.rules`, isolated local emulator, zero production writes)

| Test | Expected | Actual | Result |
|---|---|---|---|
| USER2 read USER1 private vehicle | DENY | DENY | PASS |
| Admin read any vehicle | ALLOW | ALLOW | PASS |
| USER1 changes `vehicle.currentOwnerId` directly | DENY | DENY | PASS |
| USER1 read own private verification | ALLOW | ALLOW | PASS |
| USER2 read USER1's private verification | DENY | DENY | PASS |
| USER2 GET public verification by known ID | ALLOW | ALLOW | PASS |
| USER2 LIST/query public verifications | DENY | DENY | PASS |
| Owner edits verification after `isPublic=true` | DENY | DENY | PASS |
| **Admin** edits verification after `isPublic=true` | DENY | DENY | PASS |
| Create an answer under a frozen public verification | DENY | DENY | PASS |
| USER3 reads USER1/USER2 conversation | DENY | DENY | PASS |
| USER1 creates a `type:'system'` message in own conversation | *should be DENY per spec's own checklist* | **ALLOW** | **CRITICAL-01** |
| USER1 edits an existing message | DENY | DENY | PASS |
| USER1 deletes an existing message | DENY | DENY | PASS |
| Client creates a `transactions/` doc directly | DENY | DENY | PASS |
| USER1 sets `favoriteCount` to an arbitrary large number | DENY | DENY | PASS |
| Legitimate `favoriteCount +1`-only write | ALLOW | ALLOW | PASS |
| `favoriteCount +1` bundled with another field | DENY | DENY | PASS |
| Seller `pending→approved` appointment transition | ALLOW | ALLOW | PASS |
| Seller `approved→pending` appointment transition (invalid) | DENY | DENY | PASS |
| Reporter reads own discussion report back | DENY | DENY | PASS |
| Admin reads discussion report | ALLOW | ALLOW | PASS |
| User claims `accountIds/{x}` pointing at someone else's uid | DENY | DENY | PASS |
| User creates `publicProfiles/{x}` without owning the matching `accountIds` claim | DENY | DENY | PASS |

**25/25 dynamic tests matched expectation** except the one explicitly flagged above (which itself matched the *actual rule behavior* — the mismatch is against the *spec's* expectation, correctly surfaced as CRITICAL-01).

---

## Requirements Matrix

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| User (`users/{uid}`) | FAIL | §4 | Deprecated `uid` field still written; `accountId` layer covers only 5/35 users |
| Public Profile | PASS | §7 | |
| Account ID | PASS (scoped) | §6 | Correct, but scoped to 5 fixed accounts only |
| Vehicle | WARNING | §10 | Core schema correct; stale legacy fields linger in live data |
| Vehicle Identity | FAIL | §11 | Entirely unimplemented |
| Fuel Log | PASS | §12 | |
| Maintenance Log | PASS | §12 | |
| Verification | WARNING | §13–14 | Security model excellent; schema still depends on non-spec fields |
| Answer | FAIL | §15 | `aiResult` missing |
| Evidence | FAIL | §15 | `document` type missing/mislabeled |
| Marketplace | FAIL | §16 | Deprecated fields kept; lifecycle states incomplete |
| Appointment | WARNING | §17 | Doc-ID convention differs, no security impact |
| Favorite | PASS | §17 | |
| Transaction | FAIL | §18 | Entirely unimplemented (client-forgery correctly blocked regardless) |
| Conversation | FAIL | §19 | `dealConfirmation` absent |
| Message | **CRITICAL** | §19, §21 | System-message spoofing |
| Discussion | PASS | §20 | |
| Models | FAIL | §21 | Doc-ID structure, `fuelReports`/`reviews` unimplemented |
| News | FAIL | §21 | Missing `createdAt`, no category enum |
| Firestore Rules | PASS (with 1 CRITICAL carve-out) | §22, §26 | Default-deny, privacy boundaries, immutability all dynamically verified |
| Storage Rules | **CRITICAL** | §23 | Evidence readable by any signed-in user |
| Cloud Functions | FAIL | §24 | None exist (by design) |
| Test Accounts | PASS | §8 | |

---

## Collection Matrix

| Collection | Expected | Exists | Schema | Rules | Used by Code | Status |
|---|---|---|---|---|---|---|
| `users` | ✅ | ✅ (35) | Mostly correct, `uid` deprecated field present | Owner/admin-scoped | ✅ | FAIL |
| `publicProfiles` | ✅ | ✅ (5) | Exact | Claim-scoped | ✅ | PASS |
| `accountIds` | ✅ | ✅ (5, list-blocked) | Exact | Self-uid-scoped, immutable | ✅ (5 accounts only) | PASS (scoped) |
| `vehicles` (+fuelLogs, maintenanceLogs) | ✅ | ✅ (7) | Correct + stale legacy keys | Owner/admin-scoped | ✅ | WARNING |
| `verifications` (+answers, evidence) | ✅ | ✅ (7) | Correct + extra state-machine fields | get/list-split, immutable-when-public | ✅ | WARNING |
| `marketplaceListings` (+appointments) | ✅ | ✅ (2) | Correct core + kept deprecated fields | Delta-bounded, gated transitions | ✅ | FAIL |
| `transactions` | ✅ | Unreadable/unused | N/A | Default-deny | ❌ none | FAIL (missing feature) |
| `vehicleModels` (+fuelReports, reviews) | ✅ | ✅ (0) | Auto-ID, subcollections absent | Admin-write-only | Admin only | FAIL |
| `vehicleNews` | ✅ | ✅ (3) | Missing `createdAt`, no category enum | Admin-write | ✅ | FAIL |
| `discussionPosts` (+comments, likes) | ✅ | ✅ (0 — see §2a) | Correct | Correct | ✅ | PASS (schema); see §2a for data-state caveat |
| `discussionReports` | ✅ | ✅ (0) | Exact | Correct isolation | ✅ | PASS |
| `conversations` (+messages) | ✅ | ✅ (14) | Extra `tag`/`context`, no `dealConfirmation` | Membership-scoped, but `system` type unguarded | ✅ | CRITICAL |
| `featuredDealers` | ❌ (deprecated) | ✅ (4) | N/A | Any-signed-in-user | ✅ | FAIL |
| `voltageSessions`/`consents`/`disclaimers`/`adminSettings`/`userPreferences`/`myListings` | ❌ | Unreadable (believed 0) | N/A | Default-deny | `voltageSessions` only (dead) | FAIL (voltageSessions) / PASS (others) |

---

## Deprecated Matrix

| Deprecated Collection / Field | Firestore | Code | Rules | Result |
|---|---|---|---|---|
| `voltageSessions` | Unreadable, believed 0 | **FOUND** (service + 2 admin pages) | Absent | FAIL |
| `featuredDealers` | 4 live docs | FOUND, live | Present, broad | FAIL |
| `currentRole`/`defaultRole`/`accountType` | — | Absent | — | PASS |
| `context`/`tag` (conversations) | Live, on all 14 docs | FOUND, real fields | Referenced in rule comments accurately | WARNING |
| `verificationScore`/`sellerRating`/`sellerReviewCount`/`sellerType`/`availableDates`/`timeSlots` | Live on both real listings | FOUND, live throughout marketplace code | N/A | FAIL |
| `uid` (users) | Live on every user doc | FOUND | N/A | FAIL |
| `year`/`imageUrl`/`avgFuelConsumption` (vehicles) | Stale on several live docs | Not read by any code | N/A | WARNING |
| `vechicleId`/`createAt`/`createId` (typos) | — | Absent | — | PASS |
| `conversationId` (as a message-doc field) | Absent | Confirmed dropped | N/A | PASS |

---

## Limitations / could not be independently tested this round

1. **`voltageSessions`, `consents`, `disclaimers`, `adminSettings`, `userPreferences`, `myListings` document counts** — these collections have no rule at all (not even an admin bypass), so the client SDK cannot read them under any identity. This audit relied on the prior migration report's self-reported deletion counts, not an independently re-confirmed count. A `gcloud firestore` export or Admin SDK service-account key (neither exists in this project by design) would be needed to verify with certainty.
2. **Subcollection-wide document counts** (`fuelLogs`, `answers`, `evidence`, `comments`, `likes`, etc.) — an unfiltered `collectionGroup()` scan is rejected by Firestore's list-validator because the underlying rules depend on a per-document ancestor lookup, even for the admin branch. Structural correctness was instead confirmed via code-path analysis and the specific live samples shown throughout this report, not a single global count.
3. **Buyer-side appointment transitions** (`pending/approved→cancelled`) and the answers/evidence-delete variants of the immutability guard were verified via rules-text analysis (identical guard pattern to what *was* dynamically tested) rather than separately re-run live, for time reasons — confidence is high given the structural symmetry, but they were not independently executed.
4. **The file-disappearance anomaly (§2a)** — this audit cannot determine with certainty what process deleted `scripts/_scratch-audit-discussion.mjs`/`_scratch-clear-discussion.mjs` or touched `scripts/delete-legacy-test-accounts.mjs` during this session; none of this audit's own (explicitly read-only-instructed) subagents reported writing or deleting any file. Flagged for your direct attention rather than guessed at.
5. Production Firestore was accessed **read-only** throughout. All write/forge attempts (favoriteCount tampering, system-message spoofing, ownership-transfer attempts, etc.) were executed against a local Firebase Emulator loaded with the real `firestore.rules`/`storage.rules`, never against production.

---

## Overall Readiness

- CRITICAL = **2** (not 0)
- FAIL = **18** (not 0)

**Overall: NOT READY for v1.0 freeze**, per the audit's own bar (CRITICAL=0 and FAIL=0 required). The security fundamentals that *were* tested dynamically — Firestore default-deny, vehicle/verification privacy boundaries, public-verification enumeration blocking, verification immutability (including against admin), counter tamper-resistance, transaction-forgery blocking, ownership-transfer blocking — all **PASS**. The two CRITICAL findings (chat system-message spoofing, verification-evidence Storage exposure) and the majority of the 18 FAILs are already self-disclosed, deliberate scope decisions in `docs/firestore-v1-implementation-report.md` rather than surprises — but per the letter of the v1.0 spec and this audit's pass bar, they are real gaps, not yet a clean freeze.

**This audit made no code, rules, or data changes.** Two temporary local files (`scripts/_audit-readonly-inventory.mjs`, `scripts/_audit-emulator-security-tests.mjs`) were created for read-only production inspection and isolated-emulator testing respectively, and both were deleted at the end of this session — nothing new is left in the working tree from this audit.
