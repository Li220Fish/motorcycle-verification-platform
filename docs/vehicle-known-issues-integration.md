# 車型通病資料串接指南（給前端流程負責人）

給任何要接觸「車輛新增/編輯」流程的人看的最小規格 — 說明目前系統靠哪個欄位、什麼格式，把「車輛選單資訊」（`vehicleModels`）填的通病資料，導入到驗車時的 Core Vision AI 判定提示裡。

## 唯一需要知道的規則

**這個功能能不能生效，完全取決於 `Vehicle.modelId` 這個欄位有沒有值。**

```ts
// src/types/vehicle.ts
interface Vehicle {
  ...
  modelId?: string | null // 指向 vehicleModels/{id} 的參照
}
```

- 有值（使用者實際從車型選單「選」了一筆 `vehicleModels` 主檔資料）→ 後端會依這個 id 去撈該車型的通病清單，注入對應的 Core Vision prompt。
- 是 `null`（使用者自己手打廠牌/車系文字、沒有選到主檔任何一筆）→ **完全不會有任何通病資料被注入**，這是預期行為，不是 bug。

也就是說：**任何車輛新增/編輯流程，只要有出現「選擇車型」這個步驟，就必須把選中的那筆 `vehicleModels` 文件 id 存進 `Vehicle.modelId`**。純文字輸入框無法讓這個功能生效。

現有唯一已經接好的地方可以直接參考：`src/views/VehiclesView.vue` 的 `handleModelPicked()` —— 監聽 `VehicleModelSelect.vue` 的 `@model-picked` 事件，把 `option.id` 存進 `form.modelId`：

```ts
function handleModelPicked(option: VehicleModelOption | null): void {
  form.modelId = option?.id ?? null
  form.displacementCc = option?.displacementCc ?? null
  form.transmission = option?.transmission ?? null
  form.hasChain = option?.hasChain ?? null
}
```

任何新的車輛新增/編輯入口（例如刊登流程、之後可能新增的其他表單）如果也用了 `VehicleModelSelect.vue`，都要比照這個寫法把 `modelId` 接上，否則那個入口建立的車輛永遠不會有通病資料。

## 通病資料本身存在哪裡、長什麼樣子

在 `vehicleModels/{id}` 文件上，新增了一個欄位：

```ts
// src/admin/services/admin-data.service.ts
type VehicleModelKnownIssuePart =
  | 'sides'             // 左右側外觀
  | 'rear'              // 車尾
  | 'front_suspension'  // 前避震
  | 'engine_bottom'     // 引擎底部／傳動
  | 'general'           // 其他 — 不對應任何照片，不會被送進任何 AI 判定，僅供人工參考

interface VehicleModelKnownIssue {
  id: string
  part: VehicleModelKnownIssuePart
  description: string
}

interface AdminVehicleModel {
  ...
  knownIssues: VehicleModelKnownIssue[]
}
```

這個欄位目前只在後台「車輛選單資訊」（`/admin/models`）填寫維護，前端一般使用者流程不需要、也不應該讓使用者自己編輯這個欄位 — 它是車型主檔的一部分，不是每台車各自的資料。

## 這份資料實際被用在哪裡（僅供理解全貌，前端不需要動）

`functions/src/services/vehicle-context.service.ts` 的 `resolveKnownIssuesForPart(vehicleId, part)`：讀 `vehicles/{id}.modelId` → 查 `vehicleModels/{modelId}.knownIssues` → 篩出對應 `part` 的描述文字，餵給該部位的 Core Vision Gemini 呼叫。四個部位分類直接對應四支 Core Vision 路由（左右側／車尾／前避震／引擎底部），`general` 分類的內容不會出現在任何一次 AI 呼叫裡。

## 常見誤區

- ❌ 以為填了廠牌/車系文字就會生效 —— 沒有 `modelId` 就沒有任何連結。
- ❌ 以為 `knownIssues` 是每台車自己的欄位 —— 它掛在車型主檔 `vehicleModels` 上，同一車型的所有車輛共用同一份通病清單。
- ❌ 自己在別的地方存一份「這台車的通病」——目前系統只有這一個資料來源，重複建一份會造成兩邊不同步。
