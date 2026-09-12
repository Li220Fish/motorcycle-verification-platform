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
 *  above, plus one extra top-level field: a free-text (per user decision —
 *  no fixed enum) one-sentence description of what engine type this sounds
 *  like (see engine-audio-v2.ts's ENGINE TYPE DESCRIPTION section). Kept
 *  separate from buildResultsSchema rather than adding an optional param
 *  there, since no other caller (Group A/B/C vision, OCR) needs this field. */
export function buildEngineAudioSchema(itemIds: readonly string[]): Record<string, unknown> {
  const base = buildResultsSchema(itemIds)
  return {
    ...base,
    properties: {
      ...(base.properties as Record<string, unknown>),
      engineTypeNote: { type: 'string' },
    },
    required: [...(base.required as string[]), 'engineTypeNote'],
  }
}
