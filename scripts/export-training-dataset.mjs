/**
 * Builds an Ultralytics YOLO-OBB dataset folder from a manifest downloaded
 * in /admin → 訓練資料集 → 匯出 (src/admin/services/training-dataset.service.ts
 * buildObbManifest). The manifest already carries the class list and every
 * label line in YOLO-OBB format (`class x1 y1 x2 y2 x3 y3 x4 y4`, normalized
 * corners) — computed by the same TypeScript the admin editor uses, so this
 * script never re-implements the box math or the class order.
 *
 * This script only downloads the photos and lays out:
 *   <out>/images/{train,val}/<captureId>.jpg
 *   <out>/labels/{train,val}/<captureId>.txt
 *   <out>/data.yaml
 *   <out>/manifest.json          (copy, for provenance)
 *
 * The train/val split is per SESSION (one physical bike), not per photo —
 * photos of the same bike are near-duplicates, and letting them straddle the
 * split would make validation scores meaningless.
 *
 * Auth: signs in as admin@test.com via the client SDK, same as every other
 * scripts/*.mjs (no service-account key in this repo).
 *
 * Usage:
 *   npm run training:export -- --manifest ride-obb-manifest-2026-10-07.json --out datasets/ride-obb [--val 0.2]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getBytes, getStorage, ref } from 'firebase/storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = { val: 0.2 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest') args.manifest = argv[++i]
    else if (argv[i] === '--out') args.out = argv[++i]
    else if (argv[i] === '--val') args.val = Number(argv[++i])
  }
  return args
}

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

/** Deterministic split: same session always lands in the same split. */
function isVal(sessionId, ratio) {
  const h = createHash('sha1').update(sessionId).digest()
  return h.readUInt32BE(0) / 0xffffffff < ratio
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.manifest || !args.out) {
    console.error('usage: --manifest <file.json> --out <dir> [--val 0.2]')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(path.resolve(args.manifest), 'utf-8'))
  if (manifest.format !== 'yolo-obb') {
    console.error('[export-training-dataset] not a yolo-obb manifest')
    process.exit(1)
  }

  const env = {
    ...loadEnvFile(path.join(rootDir, '.env')),
    ...loadEnvFile(path.join(rootDir, '.env.local')),
    ...process.env,
  }
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  await signInWithEmailAndPassword(getAuth(app), 'admin@test.com', 'test1234')
  const storage = getStorage(app)

  const out = path.resolve(args.out)
  for (const split of ['train', 'val']) {
    mkdirSync(path.join(out, 'images', split), { recursive: true })
    mkdirSync(path.join(out, 'labels', split), { recursive: true })
  }

  const counts = { train: 0, val: 0, skipped: 0 }
  for (const img of manifest.images) {
    if (!img.labels.length) {
      counts.skipped++
      continue
    }
    const split = isVal(img.sessionId ?? img.captureId, args.val) ? 'val' : 'train'
    const imgPath = path.join(out, 'images', split, `${img.captureId}.jpg`)
    if (!existsSync(imgPath)) {
      const bytes = await getBytes(ref(storage, img.storagePath))
      writeFileSync(imgPath, Buffer.from(bytes))
    }
    writeFileSync(
      path.join(out, 'labels', split, `${img.captureId}.txt`),
      img.labels.join('\n') + '\n',
    )
    counts[split]++
    process.stdout.write(
      `\r[export-training-dataset] ${counts.train + counts.val}/${manifest.images.length}`,
    )
  }

  // Ultralytics data.yaml — `names` keyed by class index. Keys are ASCII
  // (headlight, frontshock…) so plots/logs render without CJK fonts; the
  // Chinese labels go in a comment for reference.
  const yaml = [
    `# RiDE 部件資料集 — YOLO-OBB (YOLO26-obb). Exported ${new Date().toISOString()}`,
    `path: ${out}`,
    'train: images/train',
    'val: images/val',
    'names:',
    ...manifest.keys.map((k, i) => `  ${i}: ${k}  # ${manifest.names[i]}`),
    '',
  ].join('\n')
  writeFileSync(path.join(out, 'data.yaml'), yaml)
  writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1))

  console.log(
    `\n[export-training-dataset] train ${counts.train}, val ${counts.val}, skipped (no boxes) ${counts.skipped}`,
  )
  if (!counts.val)
    console.warn('[export-training-dataset] val split is empty — collect more bikes or raise --val')
  console.log(`[export-training-dataset] wrote ${path.join(out, 'data.yaml')}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
