# Test Accounts — FOR DEVELOPMENT / QA ONLY

These 5 accounts exist in the live `motorcycle-verification` Firebase project as the fixed
MotoVerify dev/test roster (identity layer frozen per `MotoVerify_Firestore_v1_Agent_Implementation.md`
§5 — `users/{authUid}` + `accountIds/{accountId}` + `publicProfiles/{accountId}`). **Do not use
them for real transactions.**

| Purpose | Email | Password | Account ID | Firebase UID | Permission |
|---|---|---|---|---|---|
| Admin (營運後台 `/admin`) | `admin@test.com` | `test1234` | `motoverify_admin` | `CMWrmo2pHsRiBu5kMj1CDJ23xd72` | ADMIN |
| Standard user 1 | `user1@test.com` | `test1234` | `user1` | `bku5wsBH91e7BZCVhXE9quYG8813` | STANDARD |
| Standard user 2 | `user2@test.com` | `test1234` | `user2` | `xICpEbjn3BMIhZxuqNqwMaEovIM2` | STANDARD |
| Standard user 3 | `user3@test.com` | `test1234` | `user3` | `PWTvkmEsOWUap3riy3v1WbcKGX52` | STANDARD |
| Agent / automation (Playwright, E2E, smoke, rules tests) | `agent@test.com` | `test1234` | `agenttest` | `LLbSpADznMQxaIKr3BF4MpAd6LI3` | STANDARD |

All 4 non-admin accounts are ordinary `accountTier: "standard"` users — there is no
buyer/seller/professional role concept in MotoVerify (`defaultRole`/`currentRole`/`accountType`
are not written for these accounts). Admin is **also** `accountTier: "standard"` — admin is a
system permission (`firestore.rules`' `isAdmin()`, gated on Firebase Auth uid), entirely separate
from `accountTier`, which is a business/usage tier that has no "admin" value.

Automated test data (Playwright, smoke tests, ad-hoc rules probes) should default to
`agent@test.com` / `agenttest`, not `user1`, so throwaway data stays identifiable and easy to
clean up separately from the other 3 accounts.

## Password note

The spec's original request was a literal password of `test` for every account — Firebase
Authentication rejects any password under 6 characters (`auth/weak-password`) with no
per-project override, client-SDK or otherwise. `test1234` was chosen with the user as the
smallest change that still reads as obviously "test."

## Why 5 accounts, not 3

This roster replaces the identity model the previous 3 accounts (`buyer@motoverify.test`,
`seller@motoverify.test`, `dealer@motoverify.test`) were built around — MotoVerify has no
Buyer/Seller/Dealer role, so those accounts' `defaultRole`/`accountType` fields no longer matched
how the app models identity. **Deleted 2026-09-04** (`scripts/delete-legacy-test-accounts.mjs`) —
Firebase Auth users, `users/{uid}` profile docs, and each account's own
`following`/`blockedUsers`/`savedPosts`/`favoriteListings` subcollection docs are gone. Content
those accounts *created* elsewhere (marketplace listings, discussion posts, conversations,
verifications) was deliberately left untouched — see the "Content left behind" section below.

## Vehicles

The 13 vehicles that existed in `vehicles` at the time this roster was created were reassigned
(`currentOwnerId`) round-robin across `user1`/`user2`/`user3` — not admin, not agenttest — via
`scripts/assign-vehicles-to-test-users.mjs`. 6 of the 13 turned out to be pre-existing throwaway
entries missing core data (brand/year/mileage — placeholder names like "jo46", "測試", "曼巴") and
were deleted at the user's request, along with their orphaned verifications/fuel logs/maintenance
logs. The remaining 7 had realistic demo values filled in for the v1.0 schema's optional fields
(`displacementCc`, `transmission`, `color`, `registrationDate`, `modified`, and `photos` for the 2
that had none — real, verified Wikimedia Commons photos of the matching model). Final state:

| Owner | Vehicles |
|---|---|
| user1 | YAMAHA 勁戰六代/Force 155 (DEMO-001), KAWASAKI Z900 (RKZ-0900), KYMCO Agility 125 (KYA-5588) |
| user2 | HONDA PCX 160 (MHA-6602), Yamaha MT-03 (LKK-9487) |
| user3 | SYM JET 14 125 (LJH-3321), GOGORO 1 Plus (EAK-0119) |

No new vehicles were created — this was entirely cleanup/reassignment/enrichment of what already
existed. `modelId` and `registrationDocumentUrl` were deliberately left unset (foreign-key/asset
references — inventing a fake `vehicleModels` ID or a fake document scan seemed worse than leaving
them empty, unlike plain descriptive values). GOGORO 1 Plus has no `displacementCc` — it's
electric, so the field correctly stays unset rather than a fabricated number.

## Marketplace listings

All 10 `marketplaceListings` that existed still pointed at the deleted buyer/seller/dealer
accounts (`sellerId` referencing a `users/{uid}` doc that no longer exists) — 6 of the 10
(`demo-1`..`demo-6`) were also pure fiction with no `vehicleId` at all. Cleaned up 2026-09-04:
- Deleted the 6 fictional `demo-N` listings and 2 real-vehicle-backed ones the user didn't want
  shown (KYMCO Agility 125, HONDA PCX 160). Required a rules change first —
  `marketplaceListings` had `allow delete: if false` unconditionally; added an admin-only bypass
  (matching the existing `conversations` pattern) since there's no seller-facing "取消刊登" UI.
- Rebuilt the KAWASAKI Z900 and GOGORO 1 Plus listings from scratch, rebound to their vehicle's
  *current* real owner (Z900 → user1, Gogoro → user3, with matching `sellerName`), with
  `verificationIds` populated from each vehicle's real completed verification (previously empty
  despite being `status:'published'`) and that verification flipped `isPublic:true`. Also fixed
  `favoriteCount`: Gogoro's was `-1` (invalid), Z900's was unset entirely — both now `0`.
- **Yamaha MT-03 has no listing.** Its only verification is genuinely incomplete (26 of 70
  checklist items — missing the entire appearance-photo, electrical, and engine categories, no
  `completedAt`/final mileage). Not fabricated to force a "complete" status — inspection evidence
  is the trust mechanism this whole app is built on, unlike a vehicle's plain spec values. Left
  for a real run through the verification flow (signed in as `user2`) to actually finish it, then
  it can be published the same way. **Marketplace currently shows exactly 2 listings** (Z900,
  Gogoro), by explicit choice, not 3.

## Content left behind by the deleted legacy accounts

Deleting an account only removes its Auth user, its `users/{uid}` profile, and its own
following/blocked/saved/favorite lists — not content it created in other collections. This app
denormalizes display identity at write time (`authorSnapshot`, `memberSnapshots`,
`vehicleSnapshot`) specifically so this doesn't break anything visually; the numbers below are the
actual counts found before deletion, kept here for reference:

| | buyer | seller | dealer |
|---|---|---|---|
| marketplaceListings as seller | 1 | 6 | 3 |
| discussionPosts authored | 65 | 8 | 4 |
| conversations as member | 11 | 8 | 2 |
| verifications created | 0 | 7 | 0 |

None of this was deleted. If you want it purged too (e.g. reassign to one of the 5 fixed accounts,
or hard-delete), say so explicitly — it's a materially bigger, separate operation from removing
the accounts themselves.

## users/{authUid} schema

```text
users/{authUid}
accountId, email, displayName, photoUrl, accountTier, region, lastSeenAt, createdAt
```

## publicProfiles/{accountId} schema

```text
publicProfiles/{accountId}
accountId, displayName, photoUrl, accountTier
```

Discussion/Marketplace/Chat should read `publicProfiles` for another user's public identity, never
their `users/{authUid}` doc directly (that stays private to the owner + admin).

## accountIds/{accountId} schema

```text
accountIds/{accountId}
authUid, createdAt
```

Permanently unique once claimed — the seed script refuses to reassign an `accountId` that already
points at a different uid rather than silently overwriting it.

## Regenerating

```bash
ALLOW_TEST_SEED=true npm run seed:test-users
```

The script ([scripts/seed-test-users.mjs](../scripts/seed-test-users.mjs)) is idempotent —
re-running it signs into existing accounts instead of failing, and refreshes their
`users`/`publicProfiles` documents to the canonical schema above.

## Safety

- The script uses the Firebase **client** SDK only (`createUserWithEmailAndPassword`) — there is
  no Admin SDK, no service account key, and nothing privileged to leak.
- It refuses to run when `NODE_ENV=production`.
- It refuses to run unless `ALLOW_TEST_SEED=true` is explicitly passed.
- Firebase config comes from `.env` / `.env.local` (already git-ignored) — the same
  `VITE_FIREBASE_*` values the app ships with client-side, not a secret.

## Dev-only quick login

When running in development (`import.meta.env.PROD === false`), the Login screen shows a
"測試帳號快速登入" panel with one-tap buttons for these 5 accounts. This panel is completely
absent from production builds.

## What's deliberately NOT built this round

Only these 5 accounts' identity documents are populated directly by the seed script. The general
sign-up flow (`touchUserProfile()`, called from `auth.store.ts` on every real user's sign-in)
still writes a plain `users/{authUid}` doc with no `accountId` — exactly as before this task.
Making every real signup also claim an `accountId` needs a genuine "choose your handle" onboarding
screen (`claimAccountId()`, spec §28: one-time, uniqueness-checked against `accountIds`, lowercase
4–20 chars `a-z 0-9 _ .`, reserved words blocked) — a distinct, sizeable feature in its own right,
not a byproduct of seeding 5 fixed test accounts. Deliberately deferred; ask if you want it built
as a follow-up.
