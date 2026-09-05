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
