/**
 * One-time reshape of EXISTING Firestore documents to the v1.0 schema (see
 * the approved migration plan / docs/firestore-v1-implementation-report.md).
 * This does NOT delete anything — "migrate in place" was the explicit,
 * locked decision (no destructive wipe; this project already had one real
 * data-loss incident from an unscoped wipe script — see
 * scripts/cleanup-database.mjs's own header comment).
 *
 * Purely additive: writes the new field names/shapes alongside the old
 * ones rather than deleting the old fields (Firestore's client SDK rejects
 * a plain `undefined` in a write — actually removing a field needs
 * deleteField(), which isn't worth the extra risk for a cosmetic-only
 * cleanup; no code reads the old field names anymore, so they're harmless
 * orphans). Idempotent — each migrator skips a document that already has
 * the new shape, so re-running is safe.
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account
 * (needs broad cross-owner read/write, which only admin's rule bypasses
 * grant — see firestore.rules).
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/migrate-v1-schema.mjs                        # dry run, all collections
 *   ALLOW_TEST_SEED=true node scripts/migrate-v1-schema.mjs --confirm              # apply, all collections
 *   ALLOW_TEST_SEED=true node scripts/migrate-v1-schema.mjs --only=vehicles --confirm
 *
 * --only accepts a comma-separated list of the MIGRATORS keys below.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore, Timestamp, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const result = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

function guardEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[migrate-v1-schema] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[migrate-v1-schema] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const BATCH_SIZE = 400

/** Firestore rejects `undefined` field values — strip them before writing
 * (a migrator can unconditionally set a key to `data.someOldField ?? null`
 * style fallbacks without worrying about accidentally passing undefined). */
function stripUndefined(value) {
  const result = {}
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) result[key] = val
  }
  return result
}

async function commitInBatches(db, writes) {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const w of writes.slice(i, i + BATCH_SIZE)) batch.update(w.ref, stripUndefined(w.data))
    await batch.commit()
  }
}

// --- Per-collection migrators. Each returns { scanned, writes[] }. ---

async function migrateVehicles(db) {
  const snapshot = await getDocs(collection(db, 'vehicles'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.manufactureYear !== undefined && data.photos !== undefined) continue // already migrated
    writes.push({
      ref: d.ref,
      data: {
        manufactureYear: data.manufactureYear ?? data.year ?? null,
        photos: data.photos ?? (data.imageUrl ? [data.imageUrl] : []),
        modelId: data.modelId ?? null,
        registrationDate: data.registrationDate ?? null,
        displacementCc: data.displacementCc ?? null,
        transmission: data.transmission ?? null,
        color: data.color ?? null,
        modified: data.modified ?? false,
        modificationNote: data.modificationNote ?? null,
        registrationDocumentUrl: data.registrationDocumentUrl ?? null,
      },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateFuelLogs(db) {
  const vehicles = await getDocs(collection(db, 'vehicles'))
  const writes = []
  let scanned = 0
  for (const vehicleDoc of vehicles.docs) {
    const logs = await getDocs(collection(db, 'vehicles', vehicleDoc.id, 'fuelLogs'))
    scanned += logs.size
    for (const d of logs.docs) {
      const data = d.data()
      if (data.refueledAt !== undefined) continue // already migrated
      writes.push({
        ref: d.ref,
        data: {
          refueledAt: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
          costTwd: data.costTwd ?? data.cost ?? 0,
          // No historical data can tell us this — default true (documented
          // approximation; slightly overcounts pre-migration averages since
          // every old row is treated as a full fill-up).
          fullTank: true,
          recordedBy: vehicleDoc.data().currentOwnerId ?? '',
        },
      })
    }
  }
  return { scanned, writes }
}

async function migrateMaintenanceLogs(db) {
  const vehicles = await getDocs(collection(db, 'vehicles'))
  const writes = []
  let scanned = 0
  for (const vehicleDoc of vehicles.docs) {
    const logs = await getDocs(collection(db, 'vehicles', vehicleDoc.id, 'maintenanceLogs'))
    scanned += logs.size
    for (const d of logs.docs) {
      const data = d.data()
      if (data.servicedAt !== undefined) continue // already migrated
      writes.push({
        ref: d.ref,
        data: {
          servicedAt: data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now(),
          items: data.items ?? [{ type: 'other', name: data.item ?? '', costTwd: data.cost ?? 0 }],
          shopName: data.shopName ?? null,
          totalCostTwd: data.totalCostTwd ?? data.cost ?? null,
          receiptUrls: data.receiptUrls ?? [],
          recordedBy: vehicleDoc.data().currentOwnerId ?? '',
        },
      })
    }
  }
  return { scanned, writes }
}

async function migrateVerifications(db) {
  const snapshot = await getDocs(collection(db, 'verifications'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.isPublic !== undefined) continue // already migrated
    writes.push({
      ref: d.ref,
      data: { isPublic: false, protocolVersion: 1, schemaVersion: 1 },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateUsers(db) {
  const snapshot = await getDocs(collection(db, 'users'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.accountTier !== undefined) continue // already migrated
    writes.push({
      ref: d.ref,
      data: {
        photoUrl: data.photoUrl ?? data.photoURL ?? null,
        accountTier: 'standard',
      },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateDiscussionPosts(db) {
  const snapshot = await getDocs(collection(db, 'discussionPosts'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (['active', 'hidden', 'deleted'].includes(data.status)) continue // already migrated
    writes.push({
      ref: d.ref,
      data: { status: data.status === 'published' ? 'active' : 'deleted' },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateDiscussionComments(db) {
  const posts = await getDocs(collection(db, 'discussionPosts'))
  const writes = []
  let scanned = 0
  for (const postDoc of posts.docs) {
    const comments = await getDocs(collection(db, 'discussionPosts', postDoc.id, 'comments'))
    scanned += comments.size
    for (const d of comments.docs) {
      const data = d.data()
      const needsStatus = !['active', 'hidden', 'deleted'].includes(data.status)
      const needsParent = data.parentCommentId === undefined
      if (!needsStatus && !needsParent) continue
      writes.push({
        ref: d.ref,
        data: {
          ...(needsStatus ? { status: data.status === 'published' ? 'active' : 'deleted' } : {}),
          ...(needsParent ? { parentCommentId: null } : {}),
        },
      })
    }
  }
  return { scanned, writes }
}

async function migrateVehicleNews(db) {
  const snapshot = await getDocs(collection(db, 'vehicleNews'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.sourceName !== undefined && data.content !== undefined) continue // already migrated
    writes.push({
      ref: d.ref,
      data: {
        sourceName: data.sourceName ?? data.source ?? '',
        content: data.content ?? data.body ?? '',
        // relativeTime was a decayed relative string ("3 小時前") — no way to
        // recover the original instant. Fall back to this doc's own
        // createdAt, else "now" — a documented one-time approximation.
        publishedAt: data.publishedAt ?? data.createdAt ?? Timestamp.now(),
      },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateMarketplaceListings(db) {
  const snapshot = await getDocs(collection(db, 'marketplaceListings'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.vehicleSnapshot !== undefined) continue // already migrated
    writes.push({
      ref: d.ref,
      data: {
        status: 'published', // every pre-migration listing was already effectively live
        publishedAt: data.publishedAt ?? data.createdAt ?? Timestamp.now(), // best available proxy — see report
        verificationIds: data.verificationIds ?? [],
        appointmentCount: data.appointmentCount ?? 0,
        vehicleSnapshot: {
          brand: data.brand ?? '',
          model: data.model ?? '',
          manufactureYear: data.year ?? null,
          mileage: data.mileageKm ?? 0,
          displacementCc: data.displacementCc ?? 0,
          transmission: data.transmission ?? '',
          color: data.color ?? '',
          modified: data.modified ?? false,
          photos:
            data.photos && data.photos.length > 0
              ? data.photos
              : data.imageUrl
                ? [data.imageUrl]
                : [],
        },
      },
    })
  }
  return { scanned: snapshot.size, writes }
}

async function migrateVehicleModels(db) {
  const snapshot = await getDocs(collection(db, 'vehicleModels'))
  const writes = []
  for (const d of snapshot.docs) {
    const data = d.data()
    if (data.specs !== undefined) continue // already migrated
    // mappedWritingSpec/qualityScore have no home in the new schema — logged,
    // not silently dropped, so a populated row can be reviewed before this
    // runs with --confirm.
    if (data.mappedWritingSpec || data.qualityScore != null) {
      console.warn(
        `[migrate-v1-schema]   vehicleModels/${d.id}: no v1.0 field for mappedWritingSpec=${JSON.stringify(data.mappedWritingSpec)} qualityScore=${data.qualityScore} (left in place, unused)`,
      )
    }
    writes.push({
      ref: d.ref,
      data: {
        modelYear: data.modelYear ?? null,
        trimName: data.trimName ?? null,
        bodyType: data.bodyType ?? null,
        powerType: data.powerType ?? 'gasoline',
        displacementCc: data.displacementCc ?? null,
        transmission: data.transmission ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        photos: data.photos ?? [],
        specs: {
          engine: {
            coolingType: null,
            cylinderCount: null,
            valveTrain: null,
            valvesPerCylinder: null,
            compressionRatio: null,
            maxPowerHp: null,
            maxPowerRpm: null,
            maxTorqueKgm: null,
            maxTorqueRpm: null,
            fuelSystem: null,
            startSystem: null,
            fuelTankCapacityL: null,
          },
          electric: { motorPowerW: null, motorPowerRpm: null, batteryCount: null },
          dimensions: {
            lengthMm: null,
            widthMm: null,
            heightMm: null,
            seatHeightMm: null,
            wheelbaseMm: null,
            weightKg: null,
          },
          chassis: {
            frontTireSize: null,
            rearTireSize: null,
            frontBrakeType: null,
            rearBrakeType: null,
          },
          safety: { abs: false, tcs: false, cbs: false },
          efficiency: {
            officialCityKmPerL: null,
            officialHighwayKmPerL: null,
            officialAverageKmPerL: null,
            officialRangeKm: null,
          },
        },
        features: {
          convenience: {
            keyless: false,
            usbCharging: false,
            idleStop: false,
            reverseAssist: false,
          },
          display: { displayType: null, smartphoneConnect: false, navigationSupport: false },
          lighting: {
            ledHeadlight: false,
            ledTaillight: false,
            ledTurnSignals: false,
            hazardLights: false,
          },
          storage: { underSeatStorageL: null, frontStorage: false },
          security: { immobilizer: false, antiTheftAlarm: false },
        },
        realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
        reviewStats: { averageRating: null, reviewCount: 0 },
      },
    })
  }
  return { scanned: snapshot.size, writes }
}

const MIGRATORS = {
  vehicles: migrateVehicles,
  fuelLogs: migrateFuelLogs,
  maintenanceLogs: migrateMaintenanceLogs,
  verifications: migrateVerifications,
  users: migrateUsers,
  discussionPosts: migrateDiscussionPosts,
  discussionComments: migrateDiscussionComments,
  vehicleNews: migrateVehicleNews,
  marketplaceListings: migrateMarketplaceListings,
  vehicleModels: migrateVehicleModels,
}

async function main() {
  guardEnvironment()
  const confirm = process.argv.includes('--confirm')
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : null

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
  const env = { ...envDefault, ...envLocal, ...process.env }
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[migrate-v1-schema] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(
    `[migrate-v1-schema] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE WRITE' : 'dry run'})`,
  )

  for (const [name, migrator] of Object.entries(MIGRATORS)) {
    if (only && !only.includes(name)) continue
    const { scanned, writes } = await migrator(db)
    console.log(`[migrate-v1-schema] ${name}: scanned ${scanned}, needs migration ${writes.length}`)
    if (confirm && writes.length > 0) {
      await commitInBatches(db, writes)
      console.log(`[migrate-v1-schema]   -> migrated ${writes.length} docs`)
    }
  }

  if (!confirm) {
    console.log('[migrate-v1-schema] Dry run only — pass --confirm to actually write.')
  }
  process.exit(0)
}

main().catch((error) => {
  console.error('[migrate-v1-schema] Failed:', error)
  process.exit(1)
})
