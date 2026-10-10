/**
 * EXP-R — the same measurements, run on REAL inspection evidence photos.
 *
 * These are actual Core Vision evidence files from one verification session
 * (same session as engine recording A — the timestamps are ~2 minutes apart).
 * Unlike the synthetic chart there is no ground truth here, so defect CNR
 * cannot be computed; what CAN be measured is every no-reference quality
 * metric the proposed capture-time gate would use, plus what the server stage
 * actually does to a file this size.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { sharp, toGray, laplacianVariance, basicStats, ssim, psnr } from './lib-image.mjs'

const DIR = process.argv[2] ?? 'D:/Downloads/暫存圖片/'
const SERVER_LONG_EDGE = 1280, SERVER_QUALITY = 78   // evidence.service.ts

/** Local sharpness in the sharpest region — a whole-frame Laplacian variance
 *  punishes a photo for having large smooth areas (sky, panel, floor), which
 *  says nothing about whether the subject is in focus. This takes the best
 *  tile instead: if ANY part of the frame is crisp, the shot is not blurred. */
function tiledSharpness(gray, tiles = 4) {
  const tw = Math.floor(gray.width / tiles), th = Math.floor(gray.height / tiles)
  const values = []
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const data = []
      for (let y = ty * th; y < (ty + 1) * th; y++) {
        for (let x = tx * tw; x < (tx + 1) * tw; x++) data.push(gray.data[y * gray.width + x])
      }
      values.push(laplacianVariance({ data, width: tw, height: th }))
    }
  }
  values.sort((a, b) => b - a)
  return { best: +values[0].toFixed(1), median: +values[Math.floor(values.length / 2)].toFixed(1) }
}

/** Share of pixels below a dark threshold — underexposure indicator that, unlike
 *  mean luminance, is not fooled by one bright light source in a dark frame. */
function darkShare(gray, threshold = 40) {
  let n = 0
  for (let i = 0; i < gray.data.length; i++) if (gray.data[i] < threshold) n++
  return +((n / gray.data.length) * 100).toFixed(2)
}

const files = readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
const results = { generatedAt: new Date().toISOString(), dir: DIR, serverStage: { SERVER_LONG_EDGE, SERVER_QUALITY }, photos: {} }

console.log('=== Real evidence photos, as stored ===\n')
console.log('file'.padEnd(34) + 'size      bytes   sharp(best)  sharp(med)  luma  contrast  dark%  clipHi%  entropy')

for (const f of files) {
  const buf = readFileSync(DIR + f)
  const meta = await sharp(buf).metadata()
  const gray = await toGray(buf)
  const stats = basicStats(gray)
  const sharpness = tiledSharpness(gray)
  const dark = darkShare(gray)

  // what the server stage actually does to a file this size
  const served = await sharp(buf)
    .resize({ width: SERVER_LONG_EDGE, height: SERVER_LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: SERVER_QUALITY }).toBuffer()
  const servedGray = await toGray(served)
  const serverChanged = servedGray.width !== gray.width || servedGray.height !== gray.height

  results.photos[f] = {
    storedWidth: meta.width, storedHeight: meta.height,
    bytes: buf.length, kb: +(buf.length / 1024).toFixed(1),
    hasExif: !!meta.exif,
    orientation: meta.orientation ?? null,
    sharpnessBestTile: sharpness.best, sharpnessMedianTile: sharpness.median,
    ...stats,
    darkPixelPct: dark,
    serverStage: {
      resized: serverChanged,
      outWidth: servedGray.width, outHeight: servedGray.height,
      outKb: +(served.length / 1024).toFixed(1),
      ssimVsStored: serverChanged ? null : +ssim(gray, servedGray).toFixed(4),
      psnrVsStored: serverChanged ? null : +psnr(gray, servedGray).toFixed(2),
    },
  }
  const p = results.photos[f]
  console.log(
    f.replace(/^\d+-/, '').padEnd(34) +
    `${meta.width}x${meta.height}`.padEnd(10) +
    String(p.kb + 'KB').padEnd(8) +
    String(p.sharpnessBestTile).padStart(11) +
    String(p.sharpnessMedianTile).padStart(12) +
    String(p.meanLuma).padStart(6) +
    String(p.rmsContrast).padStart(10) +
    String(p.darkPixelPct).padStart(7) +
    String(p.clippedHighlightPct).padStart(9) +
    String(p.entropyBits).padStart(9))
}

console.log('\n=== What the server analysis stage does to these files ===')
for (const [f, p] of Object.entries(results.photos)) {
  console.log(`  ${f.replace(/^\d+-/, '').padEnd(30)} ${p.storedWidth}x${p.storedHeight} → ` +
    (p.serverStage.resized
      ? `${p.serverStage.outWidth}x${p.serverStage.outHeight} (resized)`
      : `${p.serverStage.outWidth}x${p.serverStage.outHeight} NOT resized, re-encoded only ` +
        `(SSIM ${p.serverStage.ssimVsStored}, PSNR ${p.serverStage.psnrVsStored}dB, ${p.kb}→${p.serverStage.outKb}KB)`))
}

writeFileSync('real-photo-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote real-photo-results.json')
