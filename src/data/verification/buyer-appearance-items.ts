import type { VerificationItem } from './verification.types'

/**
 * 買家複驗「車輛外觀檢測」的 7 個動畫引導項目 — content from the approved
 * ride-buyer-inspection.html design (codes C-04..C-10). Each is answered
 * 正常/異常/不確定 (normal/attention/unsure) with an optional note — required
 * when 異常. BuyerAppearanceCheck.vue renders the whole group as one screen
 * (animation → freeze frame + check sheet), same "consolidated group" pattern
 * as BasicHealthCheck13.vue; the per-item text lives here so the data layer
 * stays the single source for titles/ids (report, admin, scoring).
 */
export type AppearanceAnimKey = 'steer' | 'barend' | 'peg' | 'fork' | 'clamp' | 'exhaust' | 'engine'

export interface AppearanceItemText {
  code: string
  title: string
  question: string
  hint: string
  ok: string
  bad: string
  unsure: string
  placeholder: { ok: string; bad: string; unsure: string }
}

export interface BuyerAppearanceItemDef {
  key: AppearanceAnimKey
  zh: AppearanceItemText
  en: AppearanceItemText
}

export const BUYER_APPEARANCE_ITEM_DEFS: BuyerAppearanceItemDef[] = [
  {
    key: 'steer',
    zh: {
      code: 'C-04 · 轉向系統',
      title: '龍頭轉向間隙',
      question: '把手末端和油箱之間有空隙嗎？',
      hint: '龍頭向左、向右各轉到底，看把手末端到油箱的距離。',
      ok: '左右轉到底都有明顯空隙，轉動順暢，沒有卡頓或異音。',
      bad: '把手碰到油箱、轉不到底，或左右兩邊的空隙明顯不一樣。',
      unsure: '看不太出來，或沒辦法自己判斷，先記下來之後再確認。',
      placeholder: {
        ok: '例如：轉到底時還有一個拳頭左右的空間',
        bad: '例如：向左轉到底時，左把手會碰到油箱側邊',
        unsure: '例如：光線太暗，看不清楚右側的距離',
      },
    },
    en: {
      code: 'C-04 · Steering',
      title: 'Steering Lock Clearance',
      question: 'Is there a gap between the bar ends and the tank?',
      hint: 'Turn the bars fully left and right and check the distance from the bar end to the tank.',
      ok: 'A clear gap on both sides at full lock, turns smoothly with no binding or noise.',
      bad: 'The bar hits the tank, won’t reach full lock, or the gaps differ clearly left vs right.',
      unsure: 'Hard to tell or can’t judge it yourself — note it and confirm later.',
      placeholder: {
        ok: 'e.g. About a fist-width of space at full lock',
        bad: 'e.g. At full left lock the left bar touches the side of the tank',
        unsure: 'e.g. Too dark to see the right-side gap',
      },
    },
  },
  {
    key: 'barend',
    zh: {
      code: 'C-05 · 倒地痕跡',
      title: '把手端子與拉桿',
      question: '把手端子和拉桿尾端有刮傷嗎？',
      hint: '看左右把手最外側的端子，以及煞車、離合器拉桿尾端的圓球。',
      ok: '端子和拉桿尾端表面平整，沒有刮痕、磨平或掉漆。',
      bad: '有明顯刮痕、磨平或缺角，或拉桿尾端斷掉、彎曲。',
      unsure: '有細小痕跡，分不出是倒地還是平常使用留下的。',
      placeholder: {
        ok: '例如：兩側端子都很完整',
        bad: '例如：右側端子有一片磨平，煞車拉桿尾端缺一角',
        unsure: '例如：左側端子有一點細刮痕',
      },
    },
    en: {
      code: 'C-05 · Drop Marks',
      title: 'Bar Ends & Levers',
      question: 'Are the bar ends or lever tips scratched?',
      hint: 'Check the outermost bar-end weights and the ball tips of the brake and clutch levers.',
      ok: 'Bar ends and lever tips are smooth — no scratches, flat spots or chipped paint.',
      bad: 'Clear scratches, flat spots or chips, or a lever tip that is broken or bent.',
      unsure: 'Small marks — can’t tell whether from a drop or normal use.',
      placeholder: {
        ok: 'e.g. Both bar ends are intact',
        bad: 'e.g. Right bar end ground flat, brake lever tip chipped',
        unsure: 'e.g. Light scratches on the left bar end',
      },
    },
  },
  {
    key: 'peg',
    zh: {
      code: 'C-06 · 倒地痕跡',
      title: '腳踏與打檔桿',
      question: '腳踏和打檔桿末端有磨損嗎？',
      hint: '看腳踏桿末端和打檔桿踏頭的端面，兩側都要看。',
      ok: '端面完整，沒有磨平或刮痕，桿身沒有彎曲。',
      bad: '端面磨平、有明顯刮痕，或桿身彎曲、角度不對。',
      unsure: '有痕跡但分不出原因，或看不到端面。',
      placeholder: {
        ok: '例如：兩側腳踏端面都完整',
        bad: '例如：左側打檔桿踏頭磨平，桿身往上彎',
        unsure: '例如：右側腳踏端蓋有點霧面',
      },
    },
    en: {
      code: 'C-06 · Drop Marks',
      title: 'Footpegs & Shifter',
      question: 'Are the footpeg or shifter tips worn?',
      hint: 'Check the end faces of the footpegs and the shifter tip, on both sides.',
      ok: 'End faces intact, no flat spots or scratches, nothing bent.',
      bad: 'End faces ground flat, clear scratches, or a bent / misaligned lever.',
      unsure: 'Some marks but unclear why, or the end face can’t be seen.',
      placeholder: {
        ok: 'e.g. Both footpeg ends are intact',
        bad: 'e.g. Left shifter tip ground flat and bent upward',
        unsure: 'e.g. Right footpeg end cap looks a little dull',
      },
    },
  },
  {
    key: 'fork',
    zh: {
      code: 'C-07 · 前避震',
      title: '避震器下座',
      question: '避震器下座下方有刮傷嗎？',
      hint: '看前輪軸兩側的下座，特別是最下緣和輪軸端蓋的側面。',
      ok: '下座表面完整，沒有刮痕、磨平或掉漆。',
      bad: '下緣或端蓋側面有刮痕、磨平、凹陷或掉漆。',
      unsure: '有細痕或髒污，分不出是不是倒地痕跡。',
      placeholder: {
        ok: '例如：左右下座都很乾淨',
        bad: '例如：左側下座底部有一片磨平',
        unsure: '例如：下緣有泥巴，看不清楚',
      },
    },
    en: {
      code: 'C-07 · Front Suspension',
      title: 'Fork Lower Legs',
      question: 'Are the fork lowers scratched underneath?',
      hint: 'Check the fork lowers on both sides of the front axle, especially the bottom edge and axle cap sides.',
      ok: 'Lowers intact — no scratches, flat spots or chipped paint.',
      bad: 'Scratches, flat spots, dents or chipped paint on the bottom edge or axle caps.',
      unsure: 'Fine marks or dirt — can’t tell if they’re drop marks.',
      placeholder: {
        ok: 'e.g. Both lowers are clean',
        bad: 'e.g. A flat spot under the left lower',
        unsure: 'e.g. Mud on the bottom edge, can’t see clearly',
      },
    },
  },
  {
    key: 'clamp',
    zh: {
      code: 'C-08 · 轉向系統',
      title: '下三角台擋點',
      question: '下三角台的擋點完整嗎？',
      hint: '蹲下從車頭前方往上看，下三角台中間的兩個黑色擋點。',
      ok: '兩個擋點都在，沒有裂痕、缺角或變形。',
      bad: '擋點有裂痕、缺角、變形，或其中一個不見。',
      unsure: '角度不好，看不清楚擋點的狀況。',
      placeholder: {
        ok: '例如：兩個擋點都完整',
        bad: '例如：右側擋點缺了一角',
        unsure: '例如：被線材擋住，看不到左側擋點',
      },
    },
    en: {
      code: 'C-08 · Steering',
      title: 'Lower Triple Clamp Stops',
      question: 'Are the steering stops on the lower triple clamp intact?',
      hint: 'Crouch in front of the bike and look up at the two black stops in the middle of the lower clamp.',
      ok: 'Both stops present, with no cracks, chips or deformation.',
      bad: 'A stop is cracked, chipped, deformed, or missing.',
      unsure: 'Bad angle — can’t see the stops clearly.',
      placeholder: {
        ok: 'e.g. Both stops intact',
        bad: 'e.g. The right stop is missing a corner',
        unsure: 'e.g. Cables block the view of the left stop',
      },
    },
  },
  {
    key: 'exhaust',
    zh: {
      code: 'C-09 · 倒地痕跡',
      title: '排氣管',
      question: '排氣管下緣有刮傷嗎？',
      hint: '看消音器到中段管身的下緣，順著管子從尾端往前看。',
      ok: '管身下緣平整，沒有刮痕、磨平或凹陷。',
      bad: '下緣有長條刮痕、磨平、凹陷，或護片破損。',
      unsure: '有細痕或變色，分不出是不是倒地造成的。',
      placeholder: {
        ok: '例如：消音器表面完整',
        bad: '例如：消音器下緣有一條約 10 公分的刮痕',
        unsure: '例如：尾段有一點變色',
      },
    },
    en: {
      code: 'C-09 · Drop Marks',
      title: 'Exhaust',
      question: 'Is the underside of the exhaust scratched?',
      hint: 'Check the underside from the muffler to the mid pipe, working forward from the tip.',
      ok: 'Underside smooth — no scratches, flat spots or dents.',
      bad: 'Long scratches, flat spots or dents on the underside, or a damaged heat shield.',
      unsure: 'Fine marks or discoloration — can’t tell if from a drop.',
      placeholder: {
        ok: 'e.g. Muffler surface is intact',
        bad: 'e.g. A ~10 cm scratch along the bottom of the muffler',
        unsure: 'e.g. Slight discoloration near the tip',
      },
    },
  },
  {
    key: 'engine',
    zh: {
      code: 'C-10 · 倒地痕跡',
      title: '引擎外蓋',
      question: '引擎外蓋下緣有刮傷嗎？',
      hint: '看引擎側面兩個圓形外蓋的下半部，兩側都要看。',
      ok: '外蓋表面完整，沒有刮痕、磨平或破裂。',
      bad: '外蓋下緣有刮痕、磨平、破裂，或周圍有滲油。',
      unsure: '有痕跡或髒污，分不出原因。',
      placeholder: {
        ok: '例如：左右外蓋都很完整',
        bad: '例如：左側離合器外蓋下緣磨平，有一點滲油',
        unsure: '例如：外蓋有油污，看不清楚',
      },
    },
    en: {
      code: 'C-10 · Drop Marks',
      title: 'Engine Covers',
      question: 'Are the lower edges of the engine covers scratched?',
      hint: 'Check the lower half of the round covers on the side of the engine, on both sides.',
      ok: 'Covers intact — no scratches, flat spots or cracks.',
      bad: 'Scratches, flat spots or cracks on the lower edge, or oil seeping around it.',
      unsure: 'Marks or grime — can’t tell why.',
      placeholder: {
        ok: 'e.g. Both covers are intact',
        bad: 'e.g. Left clutch cover ground flat at the bottom, slight oil seep',
        unsure: 'e.g. Oily grime on the cover, can’t see clearly',
      },
    },
  },
]

export function buyerAppearanceItemId(key: AppearanceAnimKey): string {
  return `BUYER-APP-${key}`
}

export const BUYER_APPEARANCE_ITEM_IDS: string[] = BUYER_APPEARANCE_ITEM_DEFS.map((def) =>
  buyerAppearanceItemId(def.key),
)

export function buildBuyerAppearanceItems(): VerificationItem[] {
  return BUYER_APPEARANCE_ITEM_DEFS.map((def) => ({
    id: buyerAppearanceItemId(def.key),
    title: def.zh.title,
    description: def.zh.question,
    instruction: def.zh.hint,
    type: 'check',
    required: true,
    severity: 'important',
    evidence: [{ kind: 'photo', label: '拍攝異常部分', required: false }],
  }))
}
