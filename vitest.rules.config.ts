import { defineConfig } from 'vitest/config'

// Security-rules suite — runs against the Firestore/Storage emulators via
// `npm run test:rules` (firebase emulators:exec starts them and sets the
// *_EMULATOR_HOST env vars). Kept separate from the unit suite, which runs
// fully in-memory and needs no Java/emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
