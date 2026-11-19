/**
 * 冷車檢查（ENG-02）的 AI 判定開關。
 *
 * false（目前）：只錄影並存證，不呼叫 analyzeColdEngineTouchCheck，也不擋
 * 「下一步」／完成驗證——冷車判定之後再做。影片照樣上傳，日後要補判定時
 * 資料都在。ENG-02 的答案維持 'unsure' 佔位，coldStateValid 視為 false。
 *
 * true：恢復原本流程——錄完立刻送 AI，判定完成前不能前進。
 */
export const COLD_CHECK_AI_ENABLED = false
