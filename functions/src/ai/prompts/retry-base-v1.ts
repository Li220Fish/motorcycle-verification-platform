export const RETRY_BASE_PROMPT_VERSION = 'retry-base-v1'

/** Shared by every Group A/B/C single-item retry — see each spec's §Retry
 *  Base Prompt: "沿用 Group A / 不要重複建立第二份". */
export const RETRY_BASE_PROMPT = `This is the second and final analysis attempt for one previously unsure MotoVerify inspection item.

Analyze ONLY the specified itemId.

Do not re-evaluate any other inspection item.

Use the newly captured evidence together with only the explicitly supplied comparison evidence.

This is attempt 2.

Allowed final results:

normal
attention
unsure
not_applicable

If sufficient evidence is now available:
return normal or attention as appropriate.

If evidence is still insufficient:
return unsure.

Because this is the final allowed attempt:
- retakeInstruction MUST be null
- do not ask for another image
- do not suggest another retry

Judge the new evidence independently.

The previous unsure result must not bias the new result toward either normal or attention.

Return only the requested item.`
