# Motorcycle Verification Platform — V0.1

A cross-platform motorcycle verification platform for sellers and buyers. This is the **V0.1 technical skeleton**: a single Vue 3 codebase that runs on Web, Android, and iOS via Capacitor, backed by Firebase (Auth, Firestore, Storage), with a Bluetooth BLE voltage-probe abstraction (Mock Probe included) and a basic voltage analysis service.

This version does **not** implement the real seller/buyer verification flow. Its only goal is to prove the architecture works end-to-end before that flow is designed.

## Requirements

- Node.js 22.18+ (or 24.11+)
- npm 11+
- For Android builds: Android Studio / Android SDK, `ANDROID_HOME` configured
- For iOS builds: macOS with Xcode (not required for V0.1 — see [Capacitor](#capacitor))

## Install

```bash
npm install
```

## Web

```bash
npm run dev
```

Opens the Vite dev server. All routes (`/login`, `/dashboard`, `/vehicles`, `/vehicles/:id`, `/verification`, `/probe`, `/settings`) are reachable once logged in.

## Build

```bash
npm run build
```

Type-checks with `vue-tsc` and builds a production bundle to `dist/`.

## Lint / Format

```bash
npm run lint
npm run format
```

## Capacitor

```bash
npm run cap:sync
```

Builds the web app and copies it into the native `android/` and `ios/` projects.

### Android

```bash
npm run cap:android
```

Opens the project in Android Studio. Requires `android/local.properties` with a valid `sdk.dir` (Android Studio creates this automatically the first time it opens the project; alternatively set the `ANDROID_HOME` environment variable).

### iOS

```bash
npm run cap:ios
```

Opens the project in Xcode. **Building iOS requires macOS.** On other platforms, the `ios/` project structure is still generated and kept in the repo — it just can't be compiled locally.

## Firebase

Project: **motorcycle-verification** (Firestore: asia-east1, Storage: US multi-region, Blaze plan).

Copy `.env.example` to `.env` and fill in the project's Web App config (Firebase Console → Project Settings → General → Your apps → look for "Motorcycle Verification Web"):

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.env` is git-ignored — never commit real credentials. Never commit an Admin SDK service account JSON either; it's a server-side secret, unrelated to the values above, and must never be embedded in this frontend app.

Setup status — all three verified end-to-end (register → login → create/list Vehicle → create Verification → upload/delete a Storage object → cleanup):

- ✅ Firestore Database (asia-east1), `firestore.rules` + `firestore.indexes.json` deployed
- ✅ Authentication — Email/Password sign-in enabled
- ✅ Storage (US multi-region, Blaze plan) — `storage.rules` deployed

Both Authentication and Storage had to be enabled once through the Firebase Console by the project owner (Storage specifically required attaching a Blaze billing plan — as of late 2024 Google requires this even for zero-cost usage; the free quota, 5GB storage + 1GB/day download, comfortably covers V0.1 testing).

### Deploying rules

```bash
npx firebase-tools deploy --only firestore   # rules + indexes
npx firebase-tools deploy --only storage     # rules (after Storage is enabled in Console)
```

## Mock Probe

The BLE voltage probe hardware may not exist yet, so V0.1 defaults to a **Mock Probe** (`src/services/probe/mock-probe.service.ts`) that simulates realistic voltage readings without any hardware:

1. Go to `/probe`.
2. **Connect** — simulates a BLE connection.
3. **Start** — begins emitting a voltage sample every 100ms (resting ~12.6V).
4. **Simulate Engine Start** — voltage dips (~9.8–10.4V, simulating the starter motor), then automatically rises to charging voltage (~13.8–14.1V) after ~1.5s.
5. **Stop** / **Disconnect** — as expected.

The page shows live connection state, current voltage, sample count, min/max/average analysis, and the last 20 samples.

Swapping to a real probe later only requires implementing `src/services/probe/ble-probe.service.ts` against the `VoltageProbe` interface — no other code changes.

## Real Device Hardware (BLE / Camera / Microphone)

These require the native Android/iOS app (or a browser that supports the underlying Web API) — they don't work in every environment, and each capture UI shows its own errors when a device doesn't support something:

- **Bluetooth device list** (`/probe` → "Bluetooth Devices") — scans for nearby BLE devices, lists paired devices (Android), and lets you connect/disconnect. This is a general BLE capability test, independent from the Mock/BLE Probe above (which is for the eventual voltage-probe protocol specifically — no real hardware or GATT UUIDs are defined for it yet). Uses `@capacitor-community/bluetooth-le`.
- **Camera — photo & video** (Vehicle Detail page → "Media Capture Test") — `Camera.takePhoto()` works everywhere including Web. `Camera.recordVideo()` is native-only (`@capacitor/camera` has no Web video support); on Web the component falls back to a native file-picker capture input. Uses `@capacitor/camera`.
- **Microphone recording** (same section) — start/stop recording, playback in-app, upload to Storage. Works on Web, Android, and iOS. Uses `capacitor-voice-recorder`.

All three upload their captured result straight to Firebase Storage and show the resulting URL, reusing `storageService`.

## Project Structure

```text
src/
├── components/
│   ├── common/              # Shared UI (PageHeader, etc.)
│   └── media/                # PhotoCapture / VideoCapture / AudioRecorder
├── layouts/                # AppLayout (header + sidebar/bottom nav + content)
├── views/                  # One placeholder view per route
├── router/                 # Routes + auth guard
├── stores/                 # Pinia stores (auth, vehicle, verification, probe, bluetooth)
├── services/
│   ├── firebase/            # Firebase SDK wrapper (auth/vehicle/verification/storage/voltage-session)
│   ├── probe/                # VoltageProbe interface, Mock + BLE implementations, facade
│   ├── bluetooth/            # General BLE device scan/connect wrapper
│   ├── media/                 # Camera photo/video + audio recording wrappers
│   ├── analysis/             # Voltage sample analysis
│   └── platform/             # Web/Android/iOS capability detection
├── types/                  # Domain types (User, Vehicle, Verification, VoltageSession)
└── App.vue / main.ts
```

## Data Model Notes

- **User is not split into Buyer/Seller accounts.** The same person can be a buyer today and a seller tomorrow — buyer/seller are behavioral roles, not account types.
- **Verification belongs to Vehicle, not to a person.** Every `Verification` document carries a `vehicleId`; a vehicle accumulates verifications over its lifetime (2026, 2027, 2028, ...) regardless of who performed them.
- **Raw voltage samples are not written to Firestore.** Only a `VoltageSession` summary (`minVoltage`/`maxVoltage`/`averageVoltage`) is persisted. High-frequency raw samples stay in memory for the current session — see `src/services/firebase/voltage-session.service.ts` and `src/stores/probe.store.ts`.

## Out of Scope for V0.1

Full seller/buyer verification flows, the 100+ item checklist, production UI/UX, AI, condition scoring, marketplace, chat, payments, maps, the real voltage-probe BLE hardware/protocol, ECU/IR/external-microphone/IMU diagnostic sensors. (Built-in phone Bluetooth/camera/microphone capability tests — see above — are in scope; external/specialized sensor hardware is not.) These are intentionally deferred to later versions.
