# Test Accounts — FOR DEVELOPMENT / QA ONLY

These 3 accounts exist in the live `motorcycle-verification` Firebase project for local
development, QA, and demo purposes. **Do not use them for real transactions.**

| Role | Email | Password | Display Name | UID |
|---|---|---|---|---|
| Buyer | `buyer@motoverify.test` | `MotoVerify123!` | 測試買家 | `e399kAhI9PNTmC2RqRT3K6tdiRq1` |
| Seller | `seller@motoverify.test` | `MotoVerify123!` | 測試賣家 | `C4Rn3b9vpoXn2mRoL8WJUnFOg9k1` |
| Professional Seller (Dealer) | `dealer@motoverify.test` | `MotoVerify123!` | MotoVerify 車商 | `WfRtacVURlSxRIrrtBsVX7E651c2` |

Each account has a `users/{uid}` profile document and a `userPreferences/{uid}` document
with `currentRole` pre-set to its default role, so logging in lands directly on that
role's Home screen without needing to pick a role first.

## Regenerating

```bash
ALLOW_TEST_SEED=true npm run seed:test-users
```

The script ([scripts/seed-test-users.mjs](../scripts/seed-test-users.mjs)) is idempotent — re-running
it signs into existing accounts instead of failing, and refreshes their `users/{uid}` /
`userPreferences/{uid}` documents.

## Safety

- The script uses the Firebase **client** SDK only (`createUserWithEmailAndPassword`) —
  there is no Admin SDK, no service account key, and nothing privileged to leak.
- It refuses to run when `NODE_ENV=production`.
- It refuses to run unless `ALLOW_TEST_SEED=true` is explicitly passed.
- Firebase config comes from `.env` / `.env.local` (already git-ignored) — the same
  `VITE_FIREBASE_*` values the app ships with client-side, not a secret.

## Dev-only quick login

When running in development (`import.meta.env.PROD === false`), the Login screen shows a
"測試帳號快速登入" panel with one-tap buttons for these 3 accounts. This panel is
completely absent from production builds.
