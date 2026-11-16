import type { TextMessage } from '../line/line-api'
import { clampText } from '../line/line-api'
import { RESULT_ICON, RESULT_LABEL } from '../line/messages'
import type { CheckResult } from './analyze-check'

const HEADLINE: Record<string, string> = {
  normal: '✅ 這次錄到的引擎聲音和震動沒有明顯異常。',
  attention: '⚠️ 有項目需要注意，建議找熟悉的車行再確認。',
  unsure: '❔ 這次的錄音不足以判斷，可以換個位置或安靜一點的地方再錄一次。',
}

/** Chat-sized summary of a check, shared by the LINE push and the console. */
export function resultSummaryText(result: Pick<CheckResult, 'overall' | 'items' | 'engineTypeNote'>): string {
  const lines = [HEADLINE[result.overall] ?? '', '']
  for (const item of result.items) {
    lines.push(`${RESULT_ICON[item.result] ?? ''} ${item.title}：${RESULT_LABEL[item.result] ?? item.result}`)
    if (item.note && item.result !== 'normal') lines.push(`　${item.note}`)
  }
  if (result.engineTypeNote) lines.push('', `聽起來像：${result.engineTypeNote}`)
  lines.push('', '※ 這是研究用的初步判斷，不能取代車行的實際檢修。')
  return lines.join('\n')
}

export function resultMessage(checkId: string, result: CheckResult, checkUrl: string): TextMessage {
  return {
    type: 'text',
    text: clampText(`引擎檢測結果出爐 🏍️\n\n${resultSummaryText(result)}`),
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '🙋 對結果有疑問',
            data: `action=followup&checkId=${checkId}`,
            displayText: '我對這次的檢測結果有疑問',
          },
        },
        { type: 'action', action: { type: 'uri', label: '🔁 再測一次', uri: checkUrl } },
      ],
    },
  }
}
