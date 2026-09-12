import { ResolvedImageEvidence } from './evidence.service'

/** Wraps a vehicle model's known-common-issues list (see
 *  vehicle-context.service.ts's resolveKnownIssuesForPart) in an explicit
 *  "reference only" frame before it ever reaches a prompt — without this,
 *  a line like "排氣管接口容易鏽蝕" risks reading as a pre-existing
 *  conclusion the model should confirm rather than a hint about where to
 *  look more carefully, which would undermine every Group spec's "judge
 *  only from actual evidence" rule (global-inspection-v2.ts rules 1/4/5,
 *  each core-vision-*-v1.ts's own "Do NOT diagnose..." lines) and could
 *  inflate false-positive attention rates. Exported separately from
 *  buildImageRequestContext so a caller with no known issues for this
 *  vehicle/part can skip calling it entirely. */
export function buildKnownIssuesBlock(descriptions: string[]): string[] {
  if (descriptions.length === 0) return []
  return [
    'Known common issues reported for this vehicle model (reference only):',
    ...descriptions.map((description) => `- ${description}`),
    'These are NOT confirmed defects on this specific vehicle — they only tell you where to look more carefully. Judge strictly from the actual photo evidence supplied. A listed issue with no visible sign in this photo is still normal; do not lower your attention threshold just because an issue is listed here.',
  ]
}

/** The short "Request Context" block every Group spec shows appended after
 *  the Global + Group prompt — deliberately NOT a dump of the whole Vehicle
 *  document (Group C spec §9: "不要把整份 Vehicle JSON 全丟進 Gemini"). */
export function buildImageRequestContext(params: {
  group: string
  attempt: 1 | 2
  images: ResolvedImageEvidence[]
  requestedItemIds: string[]
  vehicleContextLines?: string[]
  /** See buildKnownIssuesBlock — pass its output straight through, or omit
   *  entirely when there are none for this vehicle/part. */
  knownIssuesLines?: string[]
}): string {
  const evidenceMapping = params.images
    .map((image) => `${image.evidenceId} = ${image.view}`)
    .join('\n')
  const requestedItems = params.requestedItemIds.join('\n')
  const contextBlock = params.vehicleContextLines?.length
    ? `\nVehicle context:\n${params.vehicleContextLines.join('\n')}\n`
    : ''
  const knownIssuesBlock = params.knownIssuesLines?.length
    ? `\n${params.knownIssuesLines.join('\n')}\n`
    : ''

  return `MotoVerify inspection request.

group: ${params.group}
attempt: ${params.attempt}
${contextBlock}${knownIssuesBlock}
Evidence mapping:
${evidenceMapping}

Requested items:
${requestedItems}

Evaluate all requested items according to the Group ${params.group} rubric.`
}
