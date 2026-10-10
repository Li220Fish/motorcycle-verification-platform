/** Builds the Gemini structured-output JSON Schema shared by Group A/B/C
 *  and Audio — every spec file's "Structured Output" section uses the same
 *  envelope shape, just with a different `itemId` enum. */
export function buildResultsSchema(itemIds: readonly string[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            itemId: { type: 'string', enum: [...itemIds] },
            result: {
              type: 'string',
              enum: ['normal', 'attention', 'unsure', 'not_applicable'],
            },
            confidence: { type: ['number', 'null'] },
            label: { type: 'string' },
            note: { type: ['string', 'null'] },
            evidenceIds: { type: 'array', items: { type: 'string' } },
            problematicEvidenceIds: { type: 'array', items: { type: 'string' } },
            retakeInstruction: { type: ['string', 'null'] },
          },
          required: [
            'itemId',
            'result',
            'confidence',
            'label',
            'note',
            'evidenceIds',
            'problematicEvidenceIds',
            'retakeInstruction',
          ],
        },
      },
    },
    required: ['results'],
  }
}

/** Engine Audio only — same `{results:[...]}` envelope as buildResultsSchema
 *  above, plus two extra top-level fields: a free-text (per user decision —
 *  no fixed enum) description of what engine type this sounds like, and a
 *  0.0-1.0 confidence for that description (engine-audio-v3.ts's ENGINE TYPE
 *  section — backend/admin traceability only, never shown to the end user).
 *  Kept separate from buildResultsSchema rather than adding optional params
 *  there, since no other caller (Group A/B/C vision, OCR) needs these. */
export function buildEngineAudioSchema(itemIds: readonly string[]): Record<string, unknown> {
  const base = buildResultsSchema(itemIds)
  return {
    ...base,
    properties: {
      ...(base.properties as Record<string, unknown>),
      engineTypeNote: { type: 'string' },
      engineTypeConfidence: { type: 'number' },
    },
    required: [...(base.required as string[]), 'engineTypeNote', 'engineTypeConfidence'],
  }
}
