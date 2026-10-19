import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

export const ADMIN_UID = 'CMWrmo2pHsRiBu5kMj1CDJ23xd72'

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-rules',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  })
}

/** Writes fixture docs with rules disabled. */
export async function seed(
  env: RulesTestEnvironment,
  docs: Record<string, Record<string, unknown>>,
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    for (const [path, data] of Object.entries(docs)) await db.doc(path).set(data)
  })
}
