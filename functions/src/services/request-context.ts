import { ResolvedImageEvidence } from './evidence.service'

/** The short "Request Context" block every Group spec shows appended after
 *  the Global + Group prompt — deliberately NOT a dump of the whole Vehicle
 *  document (Group C spec §9: "不要把整份 Vehicle JSON 全丟進 Gemini"). */
export function buildImageRequestContext(params: {
  group: string
  attempt: 1 | 2
  images: ResolvedImageEvidence[]
  requestedItemIds: string[]
  vehicleContextLines?: string[]
}): string {
  const evidenceMapping = params.images
    .map((image) => `${image.evidenceId} = ${image.view}`)
    .join('\n')
  const requestedItems = params.requestedItemIds.join('\n')
  const contextBlock = params.vehicleContextLines?.length
    ? `\nVehicle context:\n${params.vehicleContextLines.join('\n')}\n`
    : ''

  return `MotoVerify inspection request.

group: ${params.group}
attempt: ${params.attempt}
${contextBlock}
Evidence mapping:
${evidenceMapping}

Requested items:
${requestedItems}

Evaluate all requested items according to the Group ${params.group} rubric.`
}
