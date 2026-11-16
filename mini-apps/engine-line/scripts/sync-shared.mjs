// Copies the RiDE engine-analysis modules this bot reuses from
// ../../functions/src into functions/src/shared (a copy, not an import, so the
// engineline codebase deploys on its own and RiDE refactors can never break
// it silently). Re-run after the RiDE pipeline changes:
//   node mini-apps/engine-line/scripts/sync-shared.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const from = path.resolve(here, '../../../functions/src')
const to = path.resolve(here, '../functions/src/shared')

const ENTRIES = [
  'config.ts',
  'ai/engine-audio',
  'ai/gemini',
  'ai/providers/audio-inspection-provider.ts',
  'ai/schemas/common.ts',
  'ai/schemas/schema-builder.ts',
  'ai/validator.ts',
  'ai/prompts/audio/engine-audio-hot-v1.ts',
  'imu',
  'video',
]

if (existsSync(to)) rmSync(to, { recursive: true })
for (const entry of ENTRIES) {
  const src = path.join(from, entry)
  const dest = path.join(to, entry)
  mkdirSync(path.dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true, filter: (file) => !file.endsWith('.test.ts') })
}
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full)
    else files.push(path.relative(to, full).split(path.sep).join('/'))
  }
}
walk(to)
writeFileSync(
  path.join(to, 'README.md'),
  `# shared (generated — do not edit)\n\nCopied from \`functions/src\` by \`mini-apps/engine-line/scripts/sync-shared.mjs\` on ${new Date().toISOString()}.\nEdit the originals in RiDE's functions/ and re-run the script.\n\n${files.map((f) => `- ${f}`).join('\n')}\n`,
)
console.log(`synced ${files.length} files into ${path.relative(process.cwd(), to)}`)
