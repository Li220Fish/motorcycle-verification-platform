# MotoVerify 功能說明書（給 Agent 的全站地圖）

> **這份文件的定位**：讓一個完全沒看過這個 repo 的 agent，在讀完之後能直接接手任何功能的修改，
> 不需要再從 router 往下爬一遍。每一節都附實際檔案路徑，**有疑慮時以程式碼為準，不以本文為準**。
>
> **與其他文件的分工**（不要重複造輪子）：
>
> | 文件 | 用途 |
> |---|---|
> | 本文 `APP_FEATURE_MANUAL.md` | **每個畫面／每個功能實際上在做什麼**、程式落點、跨功能慣例 |
> | `PROJECT_KNOWLEDGE.md` | 競賽「系統概述文件」用的專案地圖（問題定義／特色／技術堆疊等 8 段） |
> | `verification-coverage.md` | 原始驗車檢查表 170 項 → 現行流程的逐項對應稽核 |
> | `admin-backend.md` | `/admin` 後台的功能清單 ＋ 團隊自己列的真實缺口 |
> | `test-accounts.md` | 5 組測試帳號（email / 密碼 / uid） |
> | `development-history.md` | 逐次迭代的開發歷程（12k 行，查「為什麼變成現在這樣」用） |
> | `push-notification-fcm-troubleshooting.md` | FCM 推播踩雷紀錄 |
>
> ⚠️ **`README.md` 已嚴重過期**（描述成「V0.1 骨架，AI／市場／聊天皆不在範圍內」），
> 實際上這些全部已實作完成。**不要引用 README 判斷功能完成度。**

---

## 1. 60 秒速覽

MotoVerify 是一個**中古機車車況驗證 ＋ 交易**平台，手機優先（Web ＋ Capacitor 原生 App 同一份碼）。

核心主張：**賣家用手機跑完一套標準化驗車流程，拍照／錄音／收集震動資料，由後端 Gemini AI 判定每一項車況，
產出一份可信報告；買家可以在成交前自己再跑一次同樣的流程（含上路後熱車複檢），逐項比對兩份報告的差異。**

```
使用者（手機）
  ├─ 車庫：登錄自己的車（行照 OCR 驗證後才能開驗）
  ├─ 檢驗：賣家驗證 36 項 / 買家複驗 28 項（含上路＋熱車）
  │    └─ 拍照/錄音/IMU → Firebase Storage → Cloud Function → Gemini → 寫回 answers
  ├─ 市場：刊登（需綁已完成的驗證）、瀏覽、收藏、預約看車
  ├─ 訊息：買賣雙方 1:1 聊天室
  └─ 討論中心：論壇（貼文／留言／按讚／追蹤作者）＋ 車款知識庫

營運方（桌機）
  └─ /admin：使用者、驗證任務、報告品質、市場、檢舉、車款選單、健檢標記、AI Prompt 線上調整
```

| 面向 | 事實 |
|---|---|
| 前端 | Vue 3.5 `<script setup>` + TypeScript + Pinia 4 + vue-router 5 + Vite 8 |
| 原生 | Capacitor 8（`android/`、`ios/`），相機／錄音／藍牙／手電筒／推播／檔案系統 |
| 後端 | Firebase：Auth、Firestore、Storage、Cloud Functions（Node 22, Gen 2, us-central1）、Hosting、FCM |
| AI | **只有 Google Gemini**，model id 集中在 `functions/src/config.ts`（目前 `gemini-3.6-flash`） |
| 線上網址 | https://motorcycle-verification.web.app |
| Firebase 專案 | `motorcycle-verification`（見 `.firebaserc`） |
| UI 語言 | 全繁體中文；程式註解為英文 |

---

## 2. 技術堆疊與啟動方式

### 指令（`package.json`）

```bash
npm run dev            # Vite dev server
npm run build          # vue-tsc -b && vite build  → dist/
npm run lint           # eslint --fix
npm run format         # prettier
npm run test:e2e       # Playwright（tests/）
npm run cap:sync       # build + npx cap sync（同步到 android/ ios/）
npm run cap:android    # 開 Android Studio

# 種子資料（都在 scripts/，多數需要 ALLOW_TEST_SEED=true）
npm run seed:test-users
npm run seed:demo-data
npm run seed:marketplace-mock
npm run import:vehicle-models     # 車款 CSV 匯入
npm run devlog:build              # 由 git log 產生 src/data/dev-log.json
```

Cloud Functions 另有自己的 `functions/package.json`：

```bash
cd functions && npm run build     # tsc → functions/lib/
cd functions && npm test          # node:test，DSP／規則引擎單元測試
```

### 部署

```bash
npx firebase deploy --only functions            # 常常要單獨跑，見下方陷阱
npx firebase deploy --only firestore,hosting
npx firebase deploy --only storage              # storage.rules
```

> **陷阱**：`--only functions,firestore,hosting` 三個一起跑時，CLI 的
> 「分析 backend specification」階段偶發 10 秒逾時
> （`Error: User code failed to load. Cannot determine backend specification.`）。
> 這**不代表程式有錯**——先用 `cd functions && node -e "require('./lib/index.js')"` 確認能載入，
> 然後把 `functions` 拆成獨立一次 deploy 即可。

### Android APK

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug    # → android/app/build/outputs/apk/debug/app-debug.apk
```

目前只有 **debug 簽章**；要上架需要 release keystore（repo 內沒有）。

---

## 3. 身分、角色與權限

### 3.1 一般使用者

- Firebase Auth email/password（`src/services/firebase/auth.service.ts`）。
- **沒有 buyer/seller/dealer 角色欄位**。「賣家／買家」只是**同一個使用者在某一次驗證裡扮演的身分**，
  由 `Verification.type`（`'seller' | 'buyer' | 'professional'`）決定，不是帳號屬性。
- 身分三件套（Firestore v1 規格）：`users/{authUid}`（私有）＋ `accountIds/{accountId}` ＋
  `publicProfiles/{accountId}`。

### 3.2 管理員

**`/admin` 的管理員是 `firestore.rules` 裡 `isAdmin()` 的一組硬寫 Firebase Auth uid。**
這是刻意的設計決定，不是缺口——任何「可由 client 寫入的 admin 名單」都等於讓任何人自己升級為 admin。
系統**沒有**多層角色／權限分級。

- 前端守門：`src/router/index.ts` 的 `router.beforeEach` → `isAdminSession()`
  （`src/admin/services/admin-auth.service.ts`），**不是**用 `meta.requiresAuth`。
- 後端守門：`firestore.rules` 的 `isAdmin()`。

### 3.3 路由守門規則（`src/router/index.ts`）

| 條件 | 行為 |
|---|---|
| `meta.requiresAuth !== false` | 需登入；未登入 → `/login?redirect=<原路徑>` |
| 已登入又去 `/login` | → `/dashboard` |
| `/admin/*`（非 `/admin/login`） | 非 admin → `/admin/login` |
| `/admin/login` 且已是 admin | → `/admin` |
| `meta.hideChrome: true` | 隱藏 AppHeader／BottomNavigation（全螢幕畫面） |

目前 `requiresAuth: false` 的只有 `/login` 與 `/dev-log`。

---

## 4. 全站路由表

> 全部 lazy-import。`hideChrome` 代表全螢幕、沒有底部導覽。

### 前台

| 路徑 | View | 說明 |
|---|---|---|
| `/` | — | redirect → `/dashboard` |
| `/login` | `LoginView.vue` | 登入／註冊（同一頁切換） |
| `/dashboard` | `DashboardView.vue` | 首頁（`HomeContent.vue` 組合多個區塊） |
| `/vehicles` | `VehiclesView.vue` | 我的車庫（長按拖曳排序） |
| `/vehicles/:id` | `VehicleDetailView.vue` | 車輛詳情、行照驗證、油耗／保養紀錄 |
| `/verification` | `VerificationView.vue` | 驗證列表＋建立新驗證（選車、選賣家/買家） |
| `/verification/:id` | `VerificationStepsView.vue` | **驗車執行器**（`hideChrome`，全站最複雜的檔案） |
| `/verification/:id/result` | `VerificationResultView.vue` | 完成後結果摘要 |
| `/verification/:id/comparison` | `VerificationComparisonView.vue` | 買家複驗 vs 賣家驗證逐項比對 |
| `/verification/:id/report` | `VerificationReportView.vue` | 完整驗車報告（含車體圖標記） |
| `/verification/:id/share` | `ShareReportView.vue` | 分享報告（**mock**：無公開未登入入口） |
| `/probe` | `ProbeView.vue` | 電壓探棒（BLE／mock 雙模式） |
| `/marketplace` | `MarketplaceView.vue` | 市場列表、搜尋、篩選、收藏分頁 |
| `/marketplace/:id` | `MarketplaceListingView.vue` | 刊登詳情（照片、驗證報告、預約、聊天） |
| `/marketplace/:id/report` | `MarketplaceReportView.vue` | 由刊登進入的報告檢視 |
| `/reports` | `ReportsView.vue` | 我的車輛報告總覽 |
| `/my-listings` | `MyListingsView.vue` | 我的刊登列表＋建立刊登 |
| `/my-listings/:id` | `MyListingManageView.vue` | 刊登管理（照片、價格、看車時段、詢問） |
| `/messages` | `MessagesView.vue` | 對話列表（篩選／搜尋） |
| `/messages/:conversationId` | `ChatRoomView.vue` | 聊天室（`hideChrome`） |
| `/notifications` | `NotificationsView.vue` | 站內通知中心 |
| `/discussion` | `DiscussionView.vue` | 討論中心（熱門／最新／精選／追蹤＋車款知識） |
| `/discussion/compose` | `DiscussionComposeView.vue` | 發文 |
| `/discussion/:postId` | `DiscussionPostView.vue` | 貼文詳情＋留言 |
| `/discussion/vehicle-knowledge/:modelId` | `VehicleKnowledgeDetailView.vue` | 車款知識頁 |
| `/vehicle-news/:newsId` | `VehicleNewsView.vue` | 車訊新知內文 |
| `/settings` | `SettingsView.vue` | 設定首頁 |
| `/settings/account` | `AccountView.vue` | 帳號（暱稱、大頭貼、email、密碼） |
| `/settings/notifications` | `NotificationSettingsView.vue` | 通知偏好 |
| `/settings/preferences` | `PreferencesSettingsView.vue` | 偏好（深色模式等） |
| `/settings/privacy` | `PrivacyDataView.vue` | 隱私與資料 |
| `/settings/about` | `AboutView.vue` | 關於 |
| `/dev-log` | `DevLogView.vue` | **開發進度看板**（免登入，`hideChrome`，課程／競賽用） |

### 後台（全部 `hideChrome`）

| 路徑 | 說明 |
|---|---|
| `/admin/login` | 後台登入 |
| `/admin/:page?` | `AdminDashboardView.vue`，用 `page` prop 切換 section（預設 `overview`） |
| `/admin/users/:uid` | 使用者詳情（內部 `page='userdetail'`） |
| `/admin/verifications/:id` | 驗證詳情（內部 `page='verifydetail'`） |

### 底部導覽（`src/components/common/BottomNavigation.vue`）

只有 5 個 tab：`首頁 /dashboard`、`市場 /marketplace`、`檢驗 /verification`、
`訊息 /messages`（有未讀 badge）、`討論中心 /discussion`。

其他頁面（車庫、設定、通知、刊登、Probe）都是從首頁／設定／頭像等入口進去，**不在底部導覽**。

---

## 5. 功能詳述 — 前台基礎

### 5.1 登入／註冊 — `LoginView.vue`

同一頁切換登入／註冊模式；註冊時可帶 `displayName`。也支援寄送重設密碼信。
狀態全在 `src/stores/auth.store.ts`：

- `initialize()` 掛 `onAuthStateChanged`，**並且**對 `users/{uid}` 開一條即時訂閱
  （`unsubOwnProfile` → `userProfileService.subscribeOwnProfile`），所以自己改暱稱／大頭貼時，
  不必等 Firebase Auth client SDK 的快取過期，UI 立刻更新。
- `waitUntilReady()` 讓 router 守門可以 await 到 auth 狀態確定。
- `updateAvatarUrl()` 會同時寫 `users/{uid}` **和** `publicAvatars/{uid}`（見 §8.3 大頭貼機制）。

### 5.2 首頁 — `DashboardView.vue` + `components/home/`

頂部問候（頭像可點 → `/settings`）＋ 通知鈴鐺（未讀紅點）。主體 `HomeContent.vue` 依序組合：

| 區塊 | 元件 | 內容 |
|---|---|---|
| 搜尋 | `VehicleSearchBar.vue` | 車款搜尋 |
| 我的車況卡 | `VehicleStatusCard.vue` | 車庫排序第 1 台的照片＋里程／平均油耗 |
| 車輛輪播 | `VehicleCarousel.vue` | 最多前 3 台車，各顯示驗證進度 %（`answers.length / 36`）與「繼續驗證」CTA |
| 我的刊登 | `MyListingsSection.vue` | 自己刊登中的車 |
| 車訊新知 | `VehicleNewsSection.vue` | Firestore `vehicleNews` |
| 精選車商 | `FeaturedDealersSection.vue` | **暫時停用**（程式保留、呼叫處註解掉） |

> 首頁只取前 3 台車（刻意的——完整車庫在 `/vehicles`），而且用的是車庫的**手動排序**，
> 不是「最近修改」，所以使用者拖到最上面的那台就是首頁主打的那台。

### 5.3 車庫 — `VehiclesView.vue` / `VehicleDetailView.vue`

- 新增／編輯／刪除車輛。車款用 `VehicleModelSelect.vue` 從 Firestore `vehicleModels` 挑，
  挑到就記 `modelId`（手打則 `modelId = null`）。
- **長按拖曳排序**（`LONG_PRESS_MS = 450`、`MOVE_CANCEL_PX = 10`），寫入 `Vehicle.sortOrder`；
  沒排序過的車 `sortOrder` 為 null，排在所有有排序的車之後、彼此以新→舊。
- `Vehicle.hasChain` 來自挑中的車款目錄（鏈條傳動），會影響基本健檢是否出現「鏈條」項目。
- **行照驗證是開驗的前置條件**：`VehicleDetailView` 的「開始新的驗證」只有在
  `registrationVerification.status === 'passed'` 時才解鎖。
  上傳行照照片 → Cloud Function `verifyVehicleRegistrationDocument` → Gemini OCR 讀引擎號碼。
  > 2026-09 簡化後**一律 `passed`**：Gemini 仍真的 OCR 出 `ocrEngineNumber` 供顯示，
  > 但辨識結果不影響是否通過（使用者只上傳照片、不輸入任何文字）。
- 油耗紀錄 / 保養紀錄：`vehicles/{id}/fuelLogs`、`vehicles/{id}/maintenanceLogs`
  （`vehicle-log.service.ts`、平均油耗計算在 `src/utils/fuel-average.ts`）。

---

## 6. 檢驗流程（核心功能，最詳細）

### 6.1 入口與建立 — `VerificationView.vue`

列出該使用者的驗證紀錄，並建立新的。選車 ＋ 選類型（賣家／買家）。
從首頁 CTA 進來會帶 `?type=seller|buyer`，此時**不再重複問**類型（`presetType` computed）。

`Verification` 文件（`src/types/verification.ts`）：

```ts
{
  id, vehicleId, userId,
  type: 'seller' | 'buyer' | 'professional',
  status: 'draft' | 'in_progress' | 'completed' | 'needs_review' | 'expired',
  mileage?,
  relatedVerificationId?,      // 買家：要比對的那份賣家驗證
  transactionDecision?,        // 買家：繼續考慮 / 需第三方 / 不買
  isPublic,                    // 刊登上架時單向翻 true，永不翻回
  protocolVersion, schemaVersion,
  createdAt, completedAt?, expiresAt?,
  environmentContext?,         // 歷史欄位，已廢除的「驗車環境檢測」
  coldStateContext?,           // Trusted Backend only
  analysisStatus?,             // Trusted Backend only，見 §12.2
}
```

> **一份 Verification 永遠屬於一台 Vehicle，不屬於某個帳號**——同一台車會隨時間累積多份驗證
> （2026、2027、2028…），不論是誰做的。

### 6.2 架構：完全資料驅動

| 檔案 | 角色 |
|---|---|
| `src/data/verification/verification.types.ts` | `VerificationItem` / `VerificationSection` 的 schema（**先讀這個**） |
| `src/data/verification/seller-verification.ts` | 賣家 4 個分類的實際內容 |
| `src/data/verification/buyer-verification.ts` | 買家 = 賣家 sections ＋ `buyer-ride` ＋ `buyer-hot-check` |
| `src/data/verification/photo-slots.ts` | 7 個核心拍照格位（含拍攝指引、低光提示、AI 路由） |
| `src/data/verification/basic-health-check-items.ts` | 基本 12+1 項健檢定義與標記座標 |
| `src/data/verification/engine-session.ts` | 引擎錄製 session 的時間軸常數（冷／熱） |
| `src/data/verification/ai-vision-items.ts` | AI 視覺判定項目 ↔ 拍照項目的映射 |
| `src/data/verification/index.ts` | `getFlowSections()` / `getFlatItems()` / `findItemById()` |
| `src/stores/verification.store.ts` | **執行期狀態機**（811 行，最重要） |
| `src/views/VerificationStepsView.vue` | **UI 執行器**（1027 行，畫面切換與前後導航） |

UI **不硬寫任何檢查項目**；要加／改項目只要動 `src/data/verification/`（例外見 §6.8 整合畫面）。

`VerificationItem` 值得注意的欄位（完整定義見 `verification.types.ts`）：

| 欄位 | 意義 |
|---|---|
| `type` | `check / photo / video / audio / voltage / question / document / ride / form / motion / cold-touch` |
| `required` | 選填項目**不計分**（見 §6.13），買家流程還會**整個隱藏** |
| `evidence[]` | 需要哪幾種證據（`kind` + `label` + `required`） |
| `severity` | `normal / important / critical` |
| `options` | 覆寫標準的 正常／需要注意／不確定／不適用 四選一 |
| `disclosureOptions` | 改成多選 checkbox（目前只有 `PREP-02` 車況主動揭露） |
| `visibleWhen` | 條件顯示（目前只有 `PREP-02-DAMAGE-PHOTOS`，`PREP-02` 揭露碰撞／其他才出現） |
| `branch` | 條件跳步：答到某個值就直接跳到 `skipToItemId`，中間的自動標成 `not_applicable` |
| `lockedHint` | 在鎖序分類中，說明「為什麼不能略過」的文字 |
| `multiPhoto` | 改用全螢幕多張拍攝（開放張數，目前只有車損照片） |
| `transmissionSensitive` | 拍照提示隨傳動型式（速可達 vs 鏈條）而不同 |
| `lowLight` | 拍攝位置偏暗，capture 畫面會建議／強制開手電筒 |
| `canShareCapture` | 提示這一項可以和下一項共用一段連續錄製（純文案提示） |
| `aiCheck` | 這一項的照片可做哪種辨識（`appearance/plate/odometer/vin/document`）|

### 6.3 賣家流程（`Verification.type = 'seller'`）

4 個分類、靜態共 **36** 項（20 必填 ／ 16 選填）：

| # | Section id | 標題 | 項目 | 數量 |
|---|---|---|---|---|
| 0 | `seller-phase1-core` | 核心照片 | `APR-left-side` `APR-right-side` `APR-dashboard` `APR-rear` `APR-front-suspension` `APR-engine-bottom` `APR-transmission-chain` | 7（全必填） |
| 1 | `seller-phase2-basic-health` | 基本12項健檢 | `BASIC-headlight` `BASIC-turnsignal` `BASIC-taillight` `BASIC-seat` `BASIC-othermod` `BASIC-triple` `BASIC-frontshock` `BASIC-frontbrake` `BASIC-fronttire` `BASIC-rearbrake` `BASIC-reartire` `BASIC-rearshock` `BASIC-chain` | 13（6 必填） |
| 2 | `seller-phase3-engine` | 冷車＋引擎檢查 🔒 | `ENG-02`…`ENG-08` | 7（全必填） |
| 3 | `seller-phase4-disclosure` | 其他主動揭露 | `PREP-01` `PREP-02` `PREP-02-DAMAGE-PHOTOS` `PREP-04` `ELEC-10`…`ELEC-13` `ENG-01` | 9（全選填） |

🔒 = `lockedOrder: true`（只能用上／下一步走，不能自由跳，見 §6.9）

**冷車＋引擎檢查的 7 項**：
`ENG-02` 冷車狀態確認（影片）／`ENG-03` 啟動馬達聲音（音訊）／`ENG-04` 發動順暢度（音訊）／
`ENG-05` 引擎運轉聲（音訊）／`ENG-06` 油門轉動運轉聲（音訊）／
`ENG-07` 引擎運轉穩定度（IMU）／`ENG-08` 油門轉動運轉穩定度（IMU）

**其他主動揭露的 9 項**：
`PREP-01` 歷史工單（保養單文件）／`PREP-02` 車況主動揭露（多選：倒車／碰撞／其他／無）／
`PREP-02-DAMAGE-PHOTOS` 其他車損照片（多張，條件顯示）／`PREP-04` 連接專用工具（電壓探棒）／
`ELEC-10` 電系是否有改裝／`ELEC-11` 走線整齊度／`ELEC-12` 主線組完整性／
`ELEC-13` 加裝電器取電點／`ENG-01` 引擎觸感

> **歷史殘留**：`ELEC-01`…`ELEC-09`（9 項「燈會不會亮」）已從流程移除，併入基本健檢。
> `SELLER_ELECTRIC_LIGHT_ITEM_IDS` 刻意保留為**空陣列**，所以 `VerificationStepsView` 裡的
> `isLightsGroup` / `<ElectricalLightsCheck>` 分支**永遠不會成立**——還在程式裡但是死碼。
> 同理 `photo-slots.ts` 的 `RETIRED_PHOTO_SLOTS`（後避震／前煞車／後煞車／三角台／坐墊外觀／
> 其他改裝品）只為了讓 admin 看舊資料時還能顯示中文標籤。
>
> **注意**：部分註解仍寫「45 步 / 53 步」（例如 `comparison.service.ts`、`buyer-verification.ts` 開頭），
> 那是舊版數字，**已過期**。實際以 `getFlatItems()` 的長度為準。

### 6.4 買家複驗流程（`Verification.type = 'buyer'`）

買家 = `SELLER_VERIFICATION_SECTIONS` **直接 import 重用**（不是複製），再加兩個分類：

| # | Section id | 標題 | 項目 |
|---|---|---|---|
| 4 | `buyer-ride` | 上路 | `RIDE-01`（`type: 'ride'`） |
| 5 | `buyer-hot-check` | 熱車檢查 🔒 | `HOT-01` 引擎底部 ／ `HOT-02` 汽缸頭 ／ `HOT-03` 排氣端（三項拍照滲漏）／`HOT-04` 熱車引擎運轉聲（音訊）／`HOT-05` 熱車油門轉動運轉聲（音訊）／`HOT-06` 熱車怠速穩定度（IMU）／`HOT-07` 熱車油門穩定度（IMU） |

**買家會隱藏所有選填項目**：`verification.store.ts` 的 `isItemVisible()` 有
`if (flowKind === 'buyer' && !item.required) return false`。
理由：「其他主動揭露」是**賣家**自願提供的車輛歷史，買家不會自己填。
所以買家實際可見 ≈ **28** 項（20 個賣家必填 ＋ `RIDE-01` ＋ `HOT-01..07`）。

### 6.5 條件可見性 — `isItemVisible()`

三個條件在**同一個 pass** 裡處理（不是一條件一個 bespoke filter），
而且是真的從 `flatItems` / `sections` **移除**，不是 CSS 隱藏——
所以不可能出現在進度計數、Hub、或 `missingRequiredItems` 裡：

1. **鏈條條件**：`APR-transmission-chain` 與 `BASIC-chain` 在確認是速可達／CVT 時完全消失。
   判斷用 `inferTransmissionType(vehicle.transmission) !== 'scooter'`——
   **「不明」算成「可能有鏈條」**（與後端 `vehicle-context.service.ts` 一致），
   只有明確讀到速可達才隱藏，避免靜默漏掉一張可能必填的照片。
2. **`visibleWhen`**：目前只有 `PREP-02-DAMAGE-PHOTOS`。
3. **買家隱藏選填項**：見 §6.4。

### 6.6 Hub、進度與完成門檻

`VerificationHub.vue` 是進入 `/verification/:id` 時的預設畫面（`hubOpen = ref(true)`），
顯示每個分類的進度卡與「完成驗證」按鈕。

`verification.store.ts` 的完成門檻（`canComplete` / `completeVerification()`）會**五重**檢查：

1. `missingRequiredItems` — 必填項目未作答
2. `pendingRequiredUploads` — 必填證據還在上傳
3. `failedRequiredUploads` — 必填證據上傳失敗
4. `pendingRequiredAnalysis` — AI 分析還在跑
5. `failedRequiredAnalysis` — AI 分析失敗（可從 Hub 點重試 → `retryAnalysis()`）

> 第 4、5 點是刻意的：拍完照會**立刻寫一筆 placeholder answer**，
> 所以若不另外追 `analysisStatus`，「AI 從沒真的跑過」和「AI 判定正常」在 UI 上長得一模一樣。

其他 computed：`sectionProgress`、`overallProgress`、`resumeIndex`（續做位置）、
`disclosureCompleteness`、`verificationTier`（`'basic' | 'detailed' | 'complete'`）。

### 6.7 本機草稿與離線續做 — `loadFlow()`

`src/services/verification/local-draft.service.ts` 存本機草稿（離線也能繼續拍）。
`verification.store.ts` 的 `loadFlow(verificationId)` 做四件事：

1. `get()` 讀一次 Verification，**另外**開一條 `subscribeVerification` 即時訂閱——
   因為 `analysisStatus` 是後端在這個畫面開著的時候寫進來的，一次性 get 看不到。
2. 讀本機草稿 ＋ 遠端 answers／evidence。
3. **合併**：answers 以 `updatedAt` 新者勝；evidence 以 `id` 去重。
4. 把**只存在本機**的資料補推上去。

> ⚠️ **第 4 步有一個真實的資料遺失 bug 教訓**：
> `saveAnswer()` / `saveEvidence()` 都是**整份 `setDoc()` 覆寫**，而本機草稿是**拍攝當下**的副本，
> 不含任何後端後來才寫上去的欄位（AI 的 `aiResult`、upload-queue 寫的 `remoteUrl`）。
> 以前這裡**無條件**把每一筆本機資料重推一次，於是每次續做都會把那些
> server-side-only 欄位清掉——線上出現過「evidence 只剩一個死的 blob localUri、
> 沒有 remoteUrl，但檔案其實早就上傳成功」的回報。
> 現在的正解是：**凡是遠端已存在的 itemId／evidenceId 一律跳過**，只補推純本機的。

### 6.8 特殊整合畫面（**重要陷阱**）

`VerificationStepsView.vue` 的 template 是一條 `v-if / v-else-if` 鏈。多數項目走通用的
`VerificationItem.vue`（依 `type` 派發證據區塊），但**有 6 組項目被整組換成專屬全螢幕畫面**，
判斷依據是「目前項目的 id 屬不屬於某個 id 群組常數」：

| 判斷 computed | 觸發條件 | 換上的元件 | 說明 |
|---|---|---|---|
| `isCorePhotoGroup` | id ∈ 7 個 `APR-*` | `CorePhotoCaptureFlow.vue` | 連續拍 7 張核心照片，底部縮圖膠捲、長按刪除 |
| `isBasicHealthCheckGroup` | id ∈ 13 個 `BASIC-*` | `BasicHealthCheck13.vue` | 一張車體圖上點標記，**長按**打勾／打叉 |
| `isColdTouchSession` | id === `ENG-02` | `environment/ColdTouchCapture.vue` | 冷車觸碰 5 秒影片 |
| `isEngineSessionGroup` | id ∈ `ENG-03..08` | `engine/EngineInspectionFlow.vue`（`mode="cold"`） | **單次 23 秒**錄製一次搞定 6 項 |
| `isHotEngineSessionGroup` | id ∈ `HOT-04..07` | `engine/EngineInspectionFlow.vue`（`mode="hot"`） | **單次 18 秒**錄製一次搞定 4 項 |
| `isLightsGroup` | id ∈ 空陣列 | `ElectricalLightsCheck.vue` | **死碼**，永不觸發（見 §6.3） |

另有幾個攔在前面的 gate：

| computed | 元件 | 時機 |
|---|---|---|
| `showTour` | `VerificationTour.vue` | 全新驗證的一次性導覽（右上可略過，`tour.service.ts` 記狀態） |
| `needsVehicleTypeGate` | `VehicleTypeGate.vue` | 傳動型式不明時先問（決定有無外露鏈條） |
| `needsRideSafetyGate` | `RideSafetyGate.vue` | 上路前的安全確認清單 |
| `needsRideTransition` | `RideTransition.vue` | 上路動畫畫面（見 §6.11） |
| `showEngineCompleteChoice` | `EngineCompleteChoice.vue` | 引擎段跑完後問「直接結束／填補充項目」 |

另有 `AppearanceCaptureMap.vue`（核心照片的車體圖式入口，`appearanceMapOpen`）。

> **改這些的時候**：新增一個 `ENG-*` / `HOT-*` / `APR-*` / `BASIC-*` 項目，
> **不只要改 `src/data/verification/`**，還要確認它有沒有落入上面的 id 群組常數
> （`ENGINE_SESSION_ITEM_IDS`、`HOT_ENGINE_SESSION_ITEM_IDS`、`BASIC_HEALTH_CHECK_ITEM_IDS`、
> `CORE_VEHICLE_PHOTO_APR_ITEM_IDS`）——否則它會被整合畫面吞掉或被漏掉。

### 6.9 鎖序分類（`lockedOrder`）的語意

`seller-phase3-engine` 與 `buyer-hot-check` 都是 `lockedOrder: true`，因為檢查順序是程序性的
（不能在冷車檢查前就轟油門）。帶來三個特殊行為，都在 `VerificationStepsView.vue`：

1. **不能自由跳步**：`VerificationCategoryNav` 的逐項跳轉在這些分類中關閉
   （另有 `hideItemToggle` 用在基本健檢，因為它永遠是一個整合畫面，逐項跳沒有意義）。
2. **離開要警告**：`confirmLeaveEngineSection` → 離開會把整個分類的作答與證據**清空重跑**
   （`verification.store.ts` 的 `resetLockedEngineSection(sectionId)`），因為引擎一旦發動過，
   冷車狀態就回不去了。
3. **載入時防禦性重置**：若上次是中途離開（分類做一半），一進頁面就重置並顯示告知彈窗。
   > ⚠️ 這個 on-load 檢查**不能**依賴 `currentFlat`（= `flatItems[currentIndex]`），
   > 因為它跑在 `currentIndex` 被設到續做位置**之前**（還是 0）。
   > 所以有一個獨立的 `sectionInProgress(sectionId)` helper，掃 `LOCKED_SECTION_IDS` 而不看目前項目。

`item.lockedHint` 就是「為什麼不能略過」的說明文字，顯示在被禁用的「下一步」底下。
`sweepStaleEngineAnswers()` 負責清掉重跑後殘留的舊答案。

### 6.10 引擎錄製 session（冷車 23 秒 / 熱車 18 秒）

這是整個產品最特殊的設計：**一次連續錄製同時產生音訊與 IMU 資料，一次回答 4–6 個項目。**
常數全在 `src/data/verification/engine-session.ts`：

| | 冷車（賣家＋買家） | 熱車（買家限定） |
|---|---|---|
| 分類 id | `seller-phase3-engine` | `buyer-hot-check` |
| 時長 | `ENGINE_SESSION_DURATION_MS = 23000` | `HOT_ENGINE_SESSION_DURATION_MS = 18000` |
| 階段 | `startup 0–5s` / `idle 5–14s` / `rev 14–23s` | `startup 0–0s`（虛設）/ `idle 0–9s` / `rev 9–18s` |
| 音訊項目 | `ENG-03`（啟動馬達）`ENG-04`（發動順暢）`ENG-05`（怠速）`ENG-06`（油門） | `HOT-04`（怠速）`HOT-05`（油門） |
| IMU 項目 | `ENG-07`（怠速穩定）`ENG-08`（油門穩定） | `HOT-06`（怠速穩定）`HOT-07`（油門穩定） |
| 逐秒指引 | `engineSessionInstructionAt()` | `hotEngineSessionInstructionAt()` |
| Cloud Function | `analyzeEngineSensorSessionV2` | `analyzeHotEngineSensorSessionV2` |
| Gemini prompt | `audio/engine-audio-v3.ts` | `audio/engine-audio-hot-v1.ts` |
| `analysisStatus` key | `engineSensorSession` | `hotEngineSensorSession` |

UI 是**同一個元件** `EngineInspectionFlow.vue`，用 `mode?: 'cold' | 'hot'`（預設 `'cold'`）參數化：
`sessionItemIds` / `sessionDurationMs` / `sessionPhases` / `instructionAt` / `AUDIO_ITEM_IDS` /
`IMU_ITEM_IDS` / `screenTitle` / `readyCopy` / `startButtonLabel` / `finishButtonLabel` /
`sessionDurationLabel` 都是 branch 過的 computed。

> **為什麼熱車的 `startup` 是 `{ startMs: 0, endMs: 0 }` 這種零寬虛設值？**
> 後端共用的 `EngineSessionPhases` 型別要求三個欄位都存在。熱車沒有啟動階段，
> 但不是把型別改成 optional，而是保留零寬 `startup`，再靠
> `detectEngineEvents(..., assumeAlreadyRunning = true)` 跳過**偵測邏輯**。
> 該 flag 為 true 時不跑 `detectStartupEvents`，改注入一筆合成的
> `{ type: 'sustained_engine_running', timeMs: 0, confidence: 1 }` 事件——
> 否則 `hadSustainedRunning` 會永遠是 false，熄火（stall）偵測整段被跳過，真的熄火也驗不出來。
> 這條行為有專門的測試守著：`functions/src/ai/engine-audio/engine-event-detector-hot.test.ts`。

子元件：`EnginePlacementGuide.vue`（手機擺放指引）、`EngineMeasurementPanel.vue`、
`EngineWaveform.vue`（即時波形）、`EngineRecordedFileCard.vue`。
錄製服務：`src/services/media/audio-recorder.service.ts` + `src/services/motion/motion-capture.service.ts`。

### 6.11 上路（`RIDE-01`）與熱車

買家專屬，流程是：**引擎檢查完 → 上路安全確認 → 上路畫面 → 熱車檢查**。

- `RIDE-01` 的 `type: 'ride'`，**不是一個會被 AI 或使用者評分的檢查項目**。
  `RideTransition.vue` 只是一個「去騎一段，回來按繼續」的轉場畫面：
  確認時呼叫 `saveAnswer('RIDE-01', 'normal')`（沒有東西可評分）然後 `emit('advance')`。
  它刻意不走 `VerificationItem.vue`，否則會掉進通用的「正常／需要注意」結果選擇器。
- 畫面上有一個騎車 GIF 的位置，資產應放在 `public/media/riding.gif`。
  > **目前該檔案不存在**，圖片會 404，元件靠 `@error` → `gifFailed` 切到 🏍️ emoji ＋ CSS 動畫 fallback。
  > ⚠️ **不要**在 template 寫字面 `src="/media/riding.gif"`——Vue 編譯器會當成**建置期靜態資產 import**，
  > 直接讓 `npm run build` 失敗（`Could not resolve '/media/riding.gif'`）。
  > 必須像現在這樣用 `const gifSrc = '/media/riding.gif'` 再 `:src="gifSrc"` 綁定（執行期字串）。
- 買家在引擎 session 之後**不顯示** `EngineCompleteChoice` 的「直接結束 / 填補充項目」選擇，
  因為那段文案講的是賣家才有的「其他主動揭露是選填」情境；買家的下一項是必填的 `RIDE-01`。
  判斷式：`verificationStore.flowKind === 'buyer'` 時直接 advance。

### 6.12 報告、比對、分享

| 畫面 | 檔案 | 內容 |
|---|---|---|
| 結果摘要 | `VerificationResultView.vue` | 完成後的即時摘要 |
| 完整報告 | `VerificationReportView.vue` | 分區逐項結果、證據照片／音訊、`MotorcycleDiagram` 車體圖標記異常位置 |
| 買賣比對 | `VerificationComparisonView.vue` + `comparison.service.ts` | 買家複驗 vs 賣家驗證逐項 `match / different / not_checked`，另算 attention／unsure／未完成數，並可存 `transactionDecision` |
| 分享 | `ShareReportView.vue` | **MOCK**：產生連結／QR，但沒有公開未登入的報告主機（所有路由都要登入） |

比對的邏輯之所以乾淨，是因為買家前段**就是同一批 item id**（`buyer-verification.ts` 直接 import），
所以 `getFlatItems('seller')` 的每一項都有 1:1 對應；`RIDE-01`／`HOT-*` 沒有賣家對照，天然被排除。

報告的重要邏輯 `effectiveItemResult(itemId)`：AI 判定是**另一筆獨立的 answer doc**
（例如 `chain_sprocket_condition` 與檢查項目 `APR-transmission-chain` 並存），
顯示時用 **worst-of 合併**（`attention` 3 > `unsure` 2 > `normal` 1 > `not_applicable` 0）。
私有證據的 URL 要跑 `resolvePhotoUrl()`（`RESOLVABLE_EVIDENCE_TYPES = ['photo','audio']`）。

### 6.13 車況評分 — `src/services/verification/scoring.service.ts`

唯一的評分真相來源（以前在報告頁與刊登頁各寫一份，邊界條件還不一致）：

```
score = round(normal 數 / 可計分數 × 100)
```

規則：
- `not_applicable` **不進**分子也不進分母。
- 完全沒作答的項目**根本不在 answers 裡**，自然不會膨脹分母（沒有 `not_checked` 哨兵值）。
- `unsure` **進分母但不進分子**（等同 `attention`，規格明定「不能當 normal」）。
- 沒有任何可計分資料時回 **`null`**，絕不為零資料捏造 100 分（呼叫端顯示「尚無足夠資料計算」）。

`scorableAnswers(answers, flowKind)` 是餵給它之前的必要前處理：走一遍真正的流程定義，
**排除所有選填項目**，並把每個必填項目與它的 AI answer 合併成**恰好一筆**可計分 answer
（否則 AI 判定的項目會被重複計算兩次）。

---

## 7. 市場與交易

### 7.1 市場列表 — `MarketplaceView.vue`

- 兩個分頁：`market`（全部）／`favorites`（收藏）。
- 搜尋 ＋ `MarketplaceFilterSheet.vue` 篩選（品牌、價格 `PriceRangeSlider`、車身型式、
  動力型式、牌照顏色、地區…定義在 `marketplace-filters.ts`）。
- 資料來自 Firestore `marketplaceListings`（`listing.service.ts` / `home-content.service.ts`）。
- 「精選車商」區塊目前註解停用。

> 篩選的設計取捨：`bodyType` / `powerType` 是**發布時快照**的欄位，舊刊登可能是 `null`。
> 篩選把「沒有值」當成**不符合**，而不是「符合全部」——猜錯（例如把汽油車列進電動篩選）比暫時不可篩更糟。

### 7.2 刊登詳情 — `MarketplaceListingView.vue`

| 功能 | 說明 |
|---|---|
| 照片 | 封面 ＋ **其他照片**：`vehicleSnapshot.photos.slice(1)`（賣家自己上傳的）**加上**該刊登所綁驗證的 6 張核心照片，兩者**相加不互相取代** |
| 燈箱 | `PhotoGalleryLightbox.vue` — 黑底全螢幕、左右導航、底部縮圖膠捲、可旋轉（僅檢視用，不寫回） |
| 驗證報告 | `reportPath` → `/marketplace/:id/report` |
| 了解車輛 | 有 `vehicleSnapshot.modelId` 才顯示 → `/discussion/vehicle-knowledge/{modelId}` |
| 收藏 | `users/{uid}/favoriteListings/{listingId}`，會觸發賣家的通知 |
| 聊賣家 | `chatStore.findOrCreateConversation()` → `/messages/:id` |
| 預約看車 | `BookingSheet.vue` + `MonthCalendar.vue` → `marketplaceListings/{id}/appointments` |

> ⚠️ **權限陷阱（已修）**：`appointments` 的訂閱**必須按身分分流**。
> `listingService.subscribeAppointments`（不加 where）只有賣家本人能用；
> 買家要用 `subscribeAppointmentsForBuyer`（query 收窄到自己）。
> 這裡的 `subscribeAppointmentsForCurrentViewer(sellerId)` 就是在做這個分流。
> **Firestore rules 的通則**：`list` query 必須收窄到剛好符合 rule 的範圍，
> 否則整個 query 被拒（`Missing or insufficient permissions`），不是只過濾掉不該看的文件。

### 7.3 我的刊登 — `MyListingsView.vue`

列出自己的刊登、建立新刊登（選車、價格、地區／行政區 `taiwan-regions.ts`、照片上傳）。
刊登要綁**已完成的驗證**；`listingService.publish(listingId, verificationIds)` 會把每個
verification 的 `isPublic` 翻成 `true`（單向，永不翻回），買家才讀得到報告。

刊登的 `vehicleSnapshot` 是**發布當下的時間點快照**，之後**永不回頭 live-join** 私有的
`vehicles` doc（規格 §12），而且**絕不含** `licensePlate` / `engineNumber` / `chassisNumber` /
`registrationDocumentUrl` / `currentOwnerId`。

### 7.4 刊登管理 — `MyListingManageView.vue`（1172 行）

| 區塊 | 行為 |
|---|---|
| 價格／說明 | 可編輯存檔 |
| 照片 | 上傳（`imageCompressionService` 壓縮後上 Storage）、設為封面、**點擊放大／裁切**、**長按刪除** |
| 旋轉 | `PhotoLightbox.vue` 的「旋轉90度」會真的**持久化**：fetch → `createImageBitmap` → canvas `ctx.rotate()` 90° → 吐 blob 走既有的裁切上傳管線覆蓋原圖 |
| 驗證車輛照片 | `useVerificationCorePhotos` 拉出該驗證的 6 張核心照片，**唯讀**（驗證證據在驗證公開後不可變） |
| 看車時段 | 以「規則」為單位設定可預約日期＋時段，`MonthCalendar` 標示；最近用過的時間記在 localStorage `motoverify:recentViewingTimes`（最多 5 筆） |
| 詢問 | 來自買家的預約／詢問清單，可核准／拒絕（`updateAppointmentStatus` → 觸發通知 Function） |

長按刪除的慣例（整個 repo 一致，源自 `CorePhotoCaptureFlow.vue`）：
`pointerdown` 起 `setTimeout(LONG_PRESS_MS = 500)` → 設 triggered flag →
`pointerup/leave/cancel` 清 timer；`click` 看到 flag 就吞掉（避免長按後又觸發點擊）。
刪除走 `window.confirm` ＋ `storageService.deleteFileAtUrl`。

---

## 8. 社群功能

### 8.1 訊息 — `MessagesView.vue` / `ChatRoomView.vue`

- 列表：篩選（全部／未讀／交易中／系統）＋ 搜尋；已封存的對話不顯示。
- 對話資料模型（`src/services/chat/chat.types.ts`）：

```ts
Conversation {
  memberIds[], memberSnapshots: Record<uid, { displayName, photoUrl? }>,
  context?: { vehicleId?, listingId?, verificationId? },
  tag: '一般' | '買家詢問' | '交易中' | '系統',
  lastMessage, lastMessageAt,
  unreadCounts: Record<uid, number>,
  lastReadAtBy: Record<uid, number>,
  mutedBy[], archivedBy[],
}
```

- 訊息型別：`text | image | vehicle | verification_report | system`——**可以直接把車輛卡或驗車報告丟進聊天室**。
- **已讀收據放在 Conversation doc（`lastReadAtBy`），不是每則訊息的 `readBy` 陣列**：
  兩人對話不值得為了已讀而更新每一則訊息。`unreadCounts` 是 badge 的真相來源，
  `lastReadAtBy` 回答「對方看到我最後那句了嗎」。
- 每次送訊息都會順手更新 `memberSnapshots.{senderId}`（含 `photoUrl`），所以列表上的名字／頭像不會長期走鐘。
  另有 Cloud Function `onUserProfileUpdated` 在改名時同步，以及一次性補登的
  `adminSyncConversationMemberNames`。

### 8.2 討論中心 — `DiscussionView.vue` 等

- 四種排序／檢視：`hot` / `new` / `featured` / `following`，再加一個 `vehicleKnowledge` 分頁
  （`VehicleKnowledgeSection.vue` → `/discussion/vehicle-knowledge/:modelId`）。
- 分類：購車討論／賣車討論／保養維修／車款交流／騎乘生活／驗車討論／其他。
- 貼文（`discussionPosts`）：標題、內文、分類、`media[]`、`likeCount`、`commentCount`、
  `featured`、`status: active|hidden|deleted`、`authorSnapshot`。
- 留言 `discussionPosts/{id}/comments`、按讚 `discussionPosts/{id}/likes/{uid}`（doc id = uid，天然去重）。
  `parentCommentId` 已保留但**沒有巢狀回覆 UI**，永遠是 null。
- 追蹤作者：`users/{uid}/following/{targetUid}`（`AuthorFollowButton.vue`）；
  收藏貼文：`users/{uid}/savedPosts/{postId}`。
- 檢舉：`discussionReports`（post / comment / user），後台處理。

### 8.3 大頭貼的即時更新機制（**重要，容易重複踩坑**）

問題：Firestore rules 把 `users/{uid}` 收斂成**只有本人可讀**，所以別人的頭像拿不到；
但凍結式的 snapshot（`memberSnapshots` / `authorSnapshot`）又無法即時更新。

解法是三層並存，**不要把其中任何一層當成多餘的**：

| 層 | 資料 | 用途 |
|---|---|---|
| 1. 凍結快照 | `memberSnapshots[uid].photoUrl` / `authorSnapshot.photoUrl` | 離線／初次渲染的 fallback，隨訊息或貼文寫入 |
| 2. 公開頭像集合 | **`publicAvatars/{uid}`**（只有 `photoUrl`，沒有 email／displayName） | 任何登入者可讀的最小公開面，支撐**跨使用者即時更新** |
| 3. 本人即時訂閱 | `users/{uid}` 的 `subscribeOwnProfile` | 自己改頭像時立刻反映，不等 Auth SDK 快取 |

- rules：`publicAvatars/{uid}` → `allow read: if signedIn()`、
  `allow write: if signedIn() && myUid() == uid`（另有 `isAdmin()` 供補登）。
- 寫入點：`userProfileService.touchUserProfile()` 同時寫 `users/{uid}` 與 `publicAvatars/{uid}`。
- 讀取點：`src/stores/avatar.store.ts`（**ref-count 的共享訂閱池**，避免同一個 uid 被訂閱 N 次）
  ＋ `src/composables/useLiveAvatar.ts`（包好生命週期，並在沒有即時值時 fallback 到凍結快照）。
- 使用處：`ConversationRow.vue`、`DiscussionPostCard.vue`、`CommentItem.vue`、`DiscussionPostView.vue`。
- ⚠️ **`subscribePublicAvatar` 必須區分 `undefined` 與 `null`**：
  文件**不存在**時回 `undefined`（意思是「不知道，請用 fallback」），
  `photoUrl` 明確為 null 時才回 `null`（意思是「這人真的沒有頭像」）。
  兩者混用會讓還沒同步到 `publicAvatars` 的使用者，有效的凍結快照被 null 蓋掉。

### 8.4 通知 — `NotificationsView.vue`

站內通知寫在 `users/{uid}/notifications/{id}`，由 **Firestore 觸發型 Cloud Functions** 產生
（這是本專案第一批非 callable 的 Functions）：

| Function | 觸發 | 通知型別 |
|---|---|---|
| `onMessageCreated` | 新訊息 | `chat_message` |
| `onFavoriteCreated` | 刊登被收藏 | `listing_favorited` |
| `onAppointmentCreated` | 預約看車 | `booking_request` |
| `onAppointmentStatusUpdated` | 預約被核准／拒絕 | `booking_approved` / `booking_declined` |
| `onDiscussionCommentCreated` | 貼文被留言 | `discussion_comment` |
| `onDiscussionLikeCreated` | 貼文被按讚 | `discussion_like` |
| `onDiscussionPostCreated` | 管理員發文 | `discussion_admin_post` |
| `onDiscussionPostFeatured` | 貼文被設為精選 | `discussion_featured` |
| `onVehicleNewsCreated` | 新車訊 | `vehicle_news` |
| `onSystemAnnouncementCreated` | 系統公告 | `system` |

（`NotificationType` 另有 `discussion_reply`，保留未用。）

前端：`src/stores/notification.store.ts`（未讀數、標已讀、批次刪除、清空）。
推播（FCM）：`src/services/firebase/push-notification.service.ts` ＋
`users/{uid}/fcmTokens/{token}` ＋ 後端 `functions/src/services/push.service.ts`。
踩雷紀錄見 `docs/push-notification-fcm-troubleshooting.md`。

---

## 9. 其他前台功能

### 9.1 設定

| 畫面 | 內容 |
|---|---|
| `SettingsView.vue` | 設定首頁（各子頁入口、登出） |
| `AccountView.vue` | 暱稱、**大頭貼上傳**、email（需重新驗證密碼）、寄密碼重設信 |
| `NotificationSettingsView.vue` | 通知偏好開關 |
| `PreferencesSettingsView.vue` | 偏好（深色／淺色／跟隨系統 → `theme.store.ts`，用 Capacitor Preferences 持久化） |
| `PrivacyDataView.vue` | 隱私與資料說明／匯出／刪除入口 |
| `AboutView.vue` | 關於頁 |

### 9.2 Probe（電壓探棒）— `ProbeView.vue`

藍牙電壓量測裝置，**雙模式**：`mock`（模擬資料，含「模擬發動」按鈕）與 `ble`（真實 BLE）。
介面抽象在 `src/services/probe/probe.interface.ts`，實作 `ble-probe.service.ts` / `mock-probe.service.ts`。
分析在 `src/services/analysis/voltage-analysis.service.ts`，量測 session 存 `voltageSessions`。
UI：`ProbeStatusCard.vue` / `VoltageChart.vue` / `VoltageMetric.vue`。
BLE 連線管理另有 `src/stores/bluetooth.store.ts`（掃描／已配對裝置／連線）。
驗車流程裡的 `PREP-04`（連接專用工具，選填）與 `VoltageEvidenceCapture.vue` 對應這個裝置。

### 9.3 `/dev-log` — 開發進度看板

**免登入**的獨立頁面（2315 行），給課程／競賽展示開發歷程用。
資料：建置期由 git log 產生的 `src/data/dev-log.json`（`npm run devlog:build`），
再疊上 Firestore 的線上覆寫（`devlog_settings` / `devlog_submissions` / `devlog_overrides` /
`devlog_deletions`，見 `devlog.service.ts`）。分類：前台／後台／系統／檢定辨識／開發管理。

---

## 10. 營運後台 `/admin`

與手機前台**幾乎完全隔離**：自己的 `src/admin/admin.css`、自己的元件，不共用 design token；
只共用 Firestore `db` handle 與少數唯讀型別（`src/admin/services/admin-data.service.ts`）。
單一 `AdminDashboardView.vue` 用 `page` prop 切換 section。

| 群組 | key | 標題 | Section 檔案 | 功能 |
|---|---|---|---|---|
| 總覽 | `overview` | 營運總覽 | `OverviewSection.vue` | 使用者／車輛／驗證／刊登／檢舉／電壓 session 統計 |
| 使用者 | `users` | 使用者名冊 | `UsersSection.vue` | 清單；點進 `/admin/users/:uid` → `UserDetailSection.vue` |
| 使用者 | `behaviour` | 行為與興趣 | `BehaviourSection.vue` | 刊登價格分布（5 萬上下）等粗粒度分析 |
| 使用者 | `garage` | 車庫與履歷 | `GarageSection.vue` | 全站車輛與其驗證履歷 |
| 營運 | `verify` | 檢驗任務（有待辦 badge） | `VerifySection.vue` → `VerifyDetailSection.vue` | 每份驗證的逐項答案、證據、AI 判定、`analysisStatus`，含已廢除欄位的歷史檢視 |
| 營運 | `reports` | 檢驗報告品質 | `ReportsSection.vue` | 報告完整度／品質 |
| 營運 | `market` | 交易市場 | `MarketSection.vue` | 刊登管理 |
| 營運 | `messages` | 訊息與檢舉（badge） | `MessagesSection.vue` | 使用者檢舉處理 |
| 營運 | `discussion` | 討論中心（badge） | `DiscussionSection.vue` | 貼文／留言檢舉、設精選、隱藏 |
| 營運 | `news` | 車訊新知 | `NewsSection.vue` | 發布車訊（會觸發全站通知） |
| 營運 | `notifications` | 系統通知 | `NotificationsSection.vue` | 發系統公告 |
| 營運 | `probe` | Probe 裝置 | `ProbeSection.vue` | 裝置／session 檢視 |
| 內容 | `models` | 車輛選單資訊 | `ModelsSection.vue` | 車款目錄（品牌／車型／排氣量／車身型式／動力／鏈條傳動／範例圖） |
| 內容 | `healthcheck` | 健檢標記 | `HealthCheckSection.vue` + `HealthCheckAnnotationEditor/Preview.vue` | **為每個車款手動標註基本健檢 13 項的標記座標**，取代原本一體適用的硬寫座標；四個面板：總覽 / 批次上傳範例圖 / 標註＋預覽 |
| 系統設定 | `prompts` | AI Prompt 設定 | `PromptsSection.vue` | **線上檢視／覆寫送給 Gemini 的 prompt 文字，不必重新部署**（後端 `prompt-config.service.ts` ＋ callable `getAiPromptCatalog`，覆寫存 `aiPrompts`） |

> 後台自己誠實列出的真實缺口在 `docs/admin-backend.md`（無事件追蹤、無登入歷史、
> probe 遙測未接線、刊登缺 status 欄位）——那是團隊寫的一手資料，不需要重新推導。

---

## 11. 資料模型

### 11.1 Firestore collections（出自 `firestore.rules` 的 match 區塊）

| 路徑 | 說明 |
|---|---|
| `vehicles/{vehicleId}` | 車輛（私有，限擁有者＋admin） |
| `vehicles/{id}/fuelLogs/{logId}` | 加油紀錄 |
| `vehicles/{id}/maintenanceLogs/{logId}` | 保養紀錄 |
| `verifications/{verificationId}` | 驗證主文件 |
| `verifications/{id}/answers/{itemId}` | **每一項的作答**（doc id 就是 itemId） |
| `verifications/{id}/evidence/{evidenceId}` | 照片／影片／音訊／IMU／電壓證據 |
| `transactions/{transactionId}` | 交易（結構已在，流程未完整） |
| `marketplaceListings/{listingId}` | 刊登 |
| `marketplaceListings/{id}/appointments/{appointmentId}` | 預約看車 |
| `users/{userId}` | 使用者私有資料（**只有本人可讀**） |
| `users/{uid}/blockedUsers/{targetUid}` | 封鎖 |
| `users/{uid}/following/{targetUid}` | 追蹤作者 |
| `users/{uid}/savedPosts/{postId}` | 收藏貼文 |
| `users/{uid}/favoriteListings/{listingId}` | 收藏刊登 |
| `users/{uid}/fcmTokens/{token}` | 推播 token |
| `users/{uid}/notifications/{notificationId}` | 站內通知 |
| **`publicAvatars/{uid}`** | **只有 photoUrl 的公開頭像**（見 §8.3） |
| `accountIds/{accountId}` | accountId → uid |
| `publicProfiles/{accountId}` | 公開個人檔案 |
| `conversations/{conversationId}` | 對話 |
| `conversations/{id}/messages/{messageId}` | 訊息 |
| `discussionPosts/{postId}` | 貼文 |
| `discussionPosts/{id}/comments/{commentId}` | 留言 |
| `discussionPosts/{id}/likes/{uid}` | 按讚（doc id = uid，天然去重） |
| `discussionReports/{reportId}` | 檢舉 |
| `vehicleModels/**` | 車款目錄（admin 寫、全站讀） |
| `vehicleNews/**` | 車訊 |
| `systemAnnouncements/**` | 系統公告 |
| `aiPrompts/**` | AI prompt 線上覆寫 |
| `devlog_settings/**` `devlog_submissions/**` `devlog_overrides/**` `devlog_deletions/**` | /dev-log 的線上資料 |
| `{document=**}` | 最後的 catch-all 拒絕規則 |

索引定義在 `firestore.indexes.json`。

### 11.2 Firebase Storage 路徑（`storage.rules`）

| 路徑 | 性質 |
|---|---|
| `verifications/{verificationId}/evidence/**` | 驗證證據（**私有**，需 `resolveDownloadUrl` 取 URL） |
| `vehicles/{vehicleId}/**` | 車輛照片 |
| `marketplace/{listingId}/**` | 刊登照片（**公開**） |
| `conversations/{conversationId}/{uid}/**` | 聊天圖片 |
| `discussion/{postId}/**` | 貼文圖片（公開） |
| `users/{uid}/avatar/**` | 大頭貼 |
| `vehicleModels/{modelId}/**` | 車款範例圖 |
| `vehicleNews/{newsId}/**` | 車訊圖 |
| `dev-test/**` | 測試用 |

`storageService`（`src/services/firebase/storage.service.ts`）提供
`uploadPrivateFile` / `uploadEvidenceFile` / `uploadChatImage` / `uploadDiscussionImage` /
`uploadVehiclePhoto` / `uploadVehicleRegistrationDocument` / `uploadVehicleModelPhoto` /
`uploadAvatar` / `resolveDownloadUrl` / `deleteFileAtUrl`。

> **私有 vs 公開資產的讀法不同**：私有物件存的是**物件路徑**，要用
> `useStorageUrl(path)`（`src/composables/useStorageUrl.ts`）去換一個經 rules 檢查的新 download URL，
> 而且**每個 session 重新換、不跨 session 快取**。
> 已經是 `http(s)://` 的值（公開資產、或舊資料的 `remoteUrl`/`imageUrl`）會**原樣通過**，
> 不會被誤當成 Storage 路徑。

### 11.3 證據與作答

```ts
// src/types/verification-evidence.ts
EvidenceType  = 'photo' | 'video' | 'audio' | 'voltage' | 'manual' | 'document' | 'imu'
CaptureSource = 'camera' | 'file' | 'probe' | 'manual'
VerificationEvidence { id, itemId, type, remoteUrl?, createdAt, ... }

AnswerResultValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'
VerificationAnswer { itemId, result, selections?, aiResult?: AiResultDoc, ... }
```

`selections[]` 是多選揭露項（`PREP-02`）用的；`aiResult` 是 AI 判定的細節（含 note／信心度）。

---

## 12. AI 分析管線

### 12.1 Cloud Functions 總表（`functions/src/index.ts`）

**Callable（AI 分析）**

| Function | 判定內容 | prompt |
|---|---|---|
| `analyzeCoreVisionSides` | 左＋右側照 → `body_damage` / `paint_condition` | `core-vision-sides-v1.ts` |
| `analyzeCoreVisionRear` | 車尾照 → `body_damage_rear` / `paint_condition_rear` / `body_alignment_visual` | `core-vision-rear-v1.ts` |
| `analyzeCoreVisionFrontSuspension` | 前避震 → `front_suspension_condition` | `core-vision-front-suspension-v1.ts` |
| `analyzeCoreVisionEngineBottom` | 引擎底部 → `engine_bottom_leak` / `external_condition`（＋條件式 `chain_sprocket_condition`） | `core-vision-engine-bottom-v1.ts` |
| `analyzeOcrDashboard` | 儀表板里程 OCR | `dashboard-ocr-v2.ts` |
| `analyzeColdEngineTouchCheck` / `retryColdEngineTouchCheck` | 冷車觸感影片 | `cold-engine-touch-v3.ts` |
| `analyzeEngineSensorSessionV2` | **冷車 23 秒** 音訊＋IMU | `audio/engine-audio-v3.ts` |
| `analyzeHotEngineSensorSessionV2` | **熱車 18 秒** 音訊＋IMU | `audio/engine-audio-hot-v1.ts` |
| `analyzeDocumentMaintenance` | 保養單文件 | `global-inspection-v2.ts` 體系 |
| `verifyVehicleRegistrationDocument` | 行照 OCR | `registration-ocr-v1.ts` |
| `getAiPromptCatalog` | 後台讀 prompt 目錄 | — |

**Firestore 觸發（通知）**：見 §8.4 表格（10 支）。

**維運**：`onUserProfileUpdated`（改名同步聊天室快照）、
`adminSyncConversationMemberNames`（一次性補登）、`adminRestoreEvidenceRemoteUrl`。

> `core-vision` 原本是**一支**整合的 `analyzeCoreVisionV2`，2026-09 拆成 4 支獨立路由
> （每組照片一支，照片一拍好就能各自開跑）。
> 其中 `body_alignment_visual`（車身對稱性）**只看車尾照**：左右兩張是分別拍的，
> 角度／距離／取景都不同，沒有共同視覺基準，推出來的「不對稱」很可能只是攝影誤差。
> 一張車尾照才同時包含左右兩半、同一個相機位置。

Function 設定慣例（參考 `analyze-hot-engine-sensor-session.ts`）：
`onCall({ secrets: [GEMINI_API_KEY_SECRET], memory: '512MiB', timeoutSeconds: 120 })`，
API key **只存在 Secret Manager**（不在原始碼也不在 Firestore），
權限檢查走 `assertCanAnalyze(verificationId, request.auth?.uid)`。

### 12.2 `analysisStatus` — AI 的進行狀態追蹤

`functions/src/services/analysis-status.service.ts` 的 `AnalysisRouteKey` 共 8 個：

```
coreVisionSides | coreVisionRear | coreVisionFrontSuspension | coreVisionEngineBottom
dashboardOcr | coldCheck | engineSensorSession | hotEngineSensorSession
```

每支 Function 在呼叫 Gemini **前** `markProcessing`，成功 `markCompleted`，
catch 裡 `markFailed` **並 re-throw**（不吞原始錯誤，只是額外留一筆 Firestore 痕跡）。
寫在 `verifications/{id}.analysisStatus.{key}` = `{ status, updatedAt, error? }`。

> 設計理由（規格 §35「API error ≠ unsure」）：以前每支 AI 都是 client fire-and-forget
> 配一個 `.catch(() => {})`，Gemini 429／5xx／逾時／schema 失敗**完全無痕**——
> 沒有 failed answer、沒有重試入口、什麼都沒有。

前端對應：`VerificationHub.vue` 的 `ANALYSIS_LABELS`（中文標籤）、
`verification.store.ts` 的 `REQUIRED_ANALYSIS_KEYS` / `analysisStatusFor()` / `retryAnalysis()`、
後台 `VerifyDetailSection.vue` 的 `analysisRouteKeyFor(itemId)`。

**新增一支 AI 路由時要同步改的 5 個地方**：
`AnalysisRouteKey`（後端型別）→ `ANALYSIS_LABELS`（Hub 中文標籤）→
`REQUIRED_ANALYSIS_KEYS`（完成門檻）→ `retryAnalysis()`（重試分派）→
`VerifyDetailSection.vue` 的型別與 `analysisRouteKeyFor()`。

### 12.3 引擎音訊 DSP 管線（`functions/src/ai/engine-audio/`）

**不是把錄音直接丟給 Gemini**。先跑一條確定性的 DSP 管線，再把結構化特徵與事件交給 Gemini：

```
audio-decoder          （ffmpeg 解碼，binaries 在 functions/src/video/）
  ↓
audio-quality-analyzer （錄音品質：過小／削波／雜訊過高 → 可直接判定不可用）
  ↓
audio-preprocessor     （正規化／濾波）
  ↓
audio-feature-extractor（逐 window：rms / peak / crestFactor / zeroCrossingRate /
                        dominantFrequencyHz / spectralCentroid / bandwidth / flux /
                        flatness / entropy / harmonicEnergy，見 dft.ts、windowing.ts）
  ↓
engine-presence-detector（每個 window 的「引擎在運轉」機率）
  ↓
engine-event-detector  （starter_engagement / sustained_engine_running / engine_stall /
                        throttle_increase / mechanical_tapping / sharp_transient …
                        ← 熱車走 assumeAlreadyRunning = true）
  ↓
engine-phase-analyzer  （依 startup/idle/rev 階段彙總）
  ↓
engine-hard-rule-evaluator（§15-17 硬規則：熄火、油門沒轉等 → 不交給 AI 判，直接定案）
  ↓
Gemini（engine-audio-v3 / engine-audio-hot-v1，結構化輸出）
  ↓
engine-result-resolver （硬規則 ＋ Gemini → 每個 semantic item 的最終結果）
  ↓
answer-writer.service  （寫回 verifications/{id}/answers）
```

主要編排在 `functions/src/services/engine-sensor-session.service.ts`
（`analyzeEngineSensorSessionV2` / `analyzeHotEngineSensorSessionV2` / `analyzeHotEngineAudio`）。

冷／熱兩條路線的分工方式（**參數化，不是整套複製**）：

| 共用 | 冷／熱分流 |
|---|---|
| `detectEngineEvents()`（第 5 參數 `assumeAlreadyRunning`） | `evaluateEngineHardRules` vs `evaluateHotEngineHardRules`（熱車沒有啟動相關規則、沒有 `starter_motor_sound`／`start_smoothness`） |
| `SEMANTIC_ITEM_ID` 映射表（itemId → semantic，`ENG-*` 與 `HOT-*` 不會撞） | `AUDIO_ENG_ID_BY_SEMANTIC` vs `HOT_AUDIO_ENG_ID_BY_SEMANTIC`（**反向**映射會撞，因為冷熱都叫 `engine_idle_sound`／`engine_rev_sound`，必須各一份） |
| `analyzeImuItem()` | `resolveEngineAudioResults` vs `resolveHotEngineAudioResults` |

> ⚠️ `analyzeImuItem()` **直接讀 module-level 的 `SEMANTIC_ITEM_ID` 常數**（不是參數）。
> 曾經為熱車另開一張 `HOT_SEMANTIC_ITEM_ID` 表，結果 `HOT-06`／`HOT-07` 的
> `details.semanticItemId` 變成 `undefined`。正解是把 `HOT-04..07` **併進共用的那張表**。

IMU 管線另在 `functions/src/imu/`：`imu-preprocessor` → `imu-feature-extractor` →
`imu-stability-classifier`（門檻在 `imu-thresholds-v1.ts`），**純確定性數學，不經 Gemini**。

### 12.4 Gemini 結構化輸出與驗證

- Client：`functions/src/ai/gemini/client.ts`（`cache.ts` 做 prompt cache）。
- Schema：`functions/src/ai/schemas/schema-builder.ts` + `common.ts`。
- Prompt 註冊表：`functions/src/ai/prompts/registry.ts`（admin 後台能覆寫的目錄就是從這來）。
- Provider 抽象：`ai/providers/vision-inspection-provider.ts` / `audio-inspection-provider.ts`。
- **回應驗證**：`functions/src/ai/validator.ts`（共用）。

> ⚠️ **曾經的真實 bug（prompt 與 validator 不同步）**：
> validator 要求「attempt 1 的 `unsure` 必須附 `retakeInstruction`」且
> `problematicEvidenceIds` 必須是本次請求附上的 evidenceId，
> 但 prompt 從 v1 遷移到 v2／audio-v3 時**漏掉了那段「UNSURE RULE」指示**，
> 於是線上一直出現 `evidenceId not part of this request` 與
> `attempt 1 unsure result requires retakeInstruction`。
> **修法是補回 prompt 指示（不是放寬 validator）**——
> `global-inspection-v2.ts` 與 `audio/engine-audio-v3.ts` 都補上了
> 「attempt 1：說明原因＋指出 problematicEvidenceIds＋給 retakeInstruction；
> attempt 2：retakeInstruction 必須為 null」，
> `gemini/client.ts` 另外補了「有圖／音訊時必須原樣照抄 EVIDENCE_ID 標記」的明確指示。
> **改 prompt 時務必同步看 validator 的要求，反之亦然。**

### 12.5 AI 視覺判定項目 ↔ 檢查項目的映射

`src/data/verification/ai-vision-items.ts` 的 `AI_VISION_ITEMS`，每筆有自己的 `id`／`title`／
`aprItemIds`（這個 AI 判定看哪幾張照片）：

| AI item id | 中文 | 看哪張照片 |
|---|---|---|
| `body_damage` / `paint_condition` | 車體損傷／烤漆 | `APR-left-side` + `APR-right-side` |
| `body_damage_rear` / `paint_condition_rear` / `body_alignment_visual` | 車尾損傷／烤漆／車身對稱性 | `APR-rear` |
| `front_suspension_condition` | 前避震狀況 | `APR-front-suspension` |
| `engine_bottom_leak` / `external_condition` | 引擎底部滲漏／外觀 | `APR-engine-bottom` |
| `chain_sprocket_condition` | 鏈條齒盤 | `APR-transmission-chain` |

helper：`aiVisionItemTitle(itemId)`、`aiVisionItemsForAprItem(aprItemId)`。
注意 `body_damage`（左右側）與 `body_damage_rear`（車尾）是**同一件事的不同物理部位**，
顯示時用既有的 worst-of 合併，**不需要改 scoring.service.ts**。

---

## 13. 跨功能慣例（Agent 必讀）

### 13.1 快照 vs 即時訂閱

| 用途 | 做法 |
|---|---|
| 跨使用者的**顯示用**資料（名字） | 凍結快照（`memberSnapshots` / `authorSnapshot`），寫入時順手更新 |
| 跨使用者的**即時**資料（頭像） | 專門的最小公開 collection（`publicAvatars`）＋ ref-count 共享訂閱 |
| 刊登的車輛事實 | 發布時快照（`vehicleSnapshot`），**永不 live-join** 私有 `vehicles` doc |
| 自己的資料 | 直接 `onSnapshot` 訂閱 `users/{uid}` |

### 13.2 證據上傳佇列 — `src/stores/upload-queue.store.ts`

拍攝／錄音在手機上可能離線或中途被殺。流程是：
`persistLocally()`（寫本機檔案，Capacitor Filesystem）→ `enqueue()` →
`processEntry()` 上傳 Storage → 成功後 `deleteLocalFile()`。
佇列本身用 Capacitor Preferences 持久化，App 重開會 `hydrate()` 續傳；
失敗可 `retry(localId)`。`statusFor()` / `isSettled()` 供 UI 顯示。
`verification.store.ts` 的 `requiredEvidenceStatus(itemId)` 回
`'uploaded' | 'pending' | 'failed' | 'none'`，驅動完成門檻。

### 13.3 長按手勢

全 repo 統一（源自 `CorePhotoCaptureFlow.vue`）：
`pointerdown` → `setTimeout(500ms)` → 設 triggered flag；
`pointerup` / `pointerleave` / `pointercancel` 清 timer；
`click` 看到 flag 就吞掉。
**不要用原生 `contextmenu`**（會跳瀏覽器自己的長按選單）。
使用處：核心照片膠捲刪除、基本健檢打勾／打叉、車庫拖曳排序、刊登管理照片刪除。

### 13.4 圖片旋轉：兩種語意不要混用

| 情境 | 做法 |
|---|---|
| **只是看**（驗證證據，不可變） | CSS `transform: rotate()`，純檢視（`PhotoGalleryLightbox.vue`） |
| **要存**（賣家自己上傳的刊登照） | `createImageBitmap` + canvas `ctx.rotate()` 產生新 blob，走既有裁切上傳管線覆蓋（`PhotoLightbox.vue` 的 `rotateAndConfirm()`） |

### 13.5 Firestore rules 的 list query 收窄

**這是本專案踩過最多次的坑。** `allow list` 的規則若限定了條件，
client 的 query **必須自己 where 到剛好符合**，否則**整個 query 被拒**，
不是「只過濾掉不該看的文件」。
→ 任何 `subscribeXxx` 都要想清楚「誰在看」，必要時提供兩個版本
（例：`subscribeAppointments` 賣家用 / `subscribeAppointmentsForBuyer` 買家用）。

### 13.6 Vite 靜態資產解析

Vue template 裡的**字面** `src="/path/to.ext"` 會被編譯器當成**建置期靜態 import**，
檔案不存在就直接讓 `npm run build` 失敗。
要「執行期才去抓、允許不存在」的資產，必須寫成變數再 `:src="變數"` 綁定。
（實際案例：`RideTransition.vue` 的 `riding.gif`。）

### 13.7 有疑慮時的查證順序

1. `src/router/index.ts` — 有哪些畫面
2. `functions/src/index.ts` — 有哪些後端能力
3. `src/data/verification/` — 驗車內容到底有哪些項目
4. `firestore.rules` / `storage.rules` — 誰能讀寫什麼
5. `src/admin/AdminDashboardView.vue` 的 nav 陣列 — 後台有哪些頁
6. `docs/development-history.md` — 「為什麼會變成這樣」

**不要**用 `README.md` 判斷功能完成度（已嚴重過期）。
程式註解裡的**數字**（「45 步」「53 步」「13 項」）有部分是過期的，以 `getFlatItems()` 實際長度為準。

---

## 14. 已知的 mock、邊界與未完成

| 項目 | 狀態 |
|---|---|
| `ShareReportView.vue` 分享 | **MOCK** — 沒有公開未登入的報告主機，所有路由都要登入 |
| 市場 DEMO 刊登 | `src/data/home/marketplace-mock.ts` 是權威內容來源，App 實際從 Firestore `marketplaceListings` 讀；seed 用 `ALLOW_TEST_SEED=true node scripts/seed-marketplace-mock.mjs`。**DEMO 卡片必須在 UI 上標示 DEMO** |
| `transactions` collection | 結構已在，付款／合約流程**沒有**實作 |
| `recognition/mock-recognition.service.ts` | 前端「影像輔助分析」是 mock，刻意**不自動跑**，避免 mock 結果看起來像權威判定 |
| `public/media/riding.gif` | **檔案不存在**，`RideTransition.vue` 走 emoji fallback |
| 熱車 AI prompt | **未用真實錄音測試過**（已部署上線）。買家跑複驗時建議看 Functions log |
| `ElectricalLightsCheck.vue` / `isLightsGroup` | 死碼，永不觸發 |
| `environmentContext`（驗車環境檢測／PREP-03） | 已從產品移除；型別只為舊資料型別檢查而保留，僅 admin 歷史檢視會讀 |
| `Verification.expiresAt` | 保留欄位，V0.2 **不強制** |
| `DiscussionComment.parentCommentId` | 保留欄位，永遠 null，無巢狀回覆 UI |
| `NotificationType.discussion_reply` | 型別已有，無觸發來源 |
| 精選車商 | 程式保留、呼叫處註解停用 |
| `Vehicle.engineNumber` / `chassisNumber` | 可填但**完成驗證前不強制** |
| 行照 OCR 的通過判定 | **一律 `passed`**，OCR 結果只用於顯示 |
| 多層管理員／角色分級 | **不存在**，且是刻意的（見 §3.2） |
| 後台其他缺口 | 見 `docs/admin-backend.md` 團隊自列清單 |
| Android APK | 只有 debug 簽章，無 release keystore |

---

## 15. 常見修改任務的落點

| 想做的事 | 要改哪裡 |
|---|---|
| 新增／修改一個檢查項目 | `src/data/verification/seller-verification.ts`（或 `buyer-verification.ts`）；**再確認**它有沒有落入 §6.8 的整合畫面 id 群組 |
| 新增一個核心拍照格位 | `src/data/verification/photo-slots.ts`（會自動長出 `APR-*` 項目）＋ 若要 AI 判定則 `ai-vision-items.ts` ＋ 新後端路由 |
| 改基本健檢的項目或標記位置 | `basic-health-check-items.ts`（項目）＋ 後台「健檢標記」逐車款標註座標 |
| 改引擎錄製時長／階段 | `src/data/verification/engine-session.ts`，**同時**確認後端 `EngineSessionPhases` 與 prompt 裡的時間軸描述一致 |
| 新增一支 AI 分析路由 | 見 §12.2 的「要同步改的 5 個地方」＋ 新 prompt 檔 ＋ `prompts/registry.ts` ＋ `functions/src/index.ts` export |
| 改 Gemini prompt 文字 | `functions/src/ai/prompts/`；**必須同步檢查 `ai/validator.ts` 的要求**（§12.4）。或走後台「AI Prompt 設定」線上覆寫，免部署 |
| 改評分公式 | `src/services/verification/scoring.service.ts`（唯一真相來源，不要在 view 裡再算一次） |
| 新增一種通知 | `src/types/notification.ts` 的 `NotificationType` ＋ 新的 Firestore 觸發 Function ＋ `functions/src/services/notification.service.ts` |
| 新增一個畫面 | `src/router/index.ts`（注意 `meta.requiresAuth` / `hideChrome`）＋ `src/views/` |
| 新增一個後台頁 | `src/admin/sections/` 新元件 ＋ `AdminDashboardView.vue` 的 nav 陣列與 component 對照 |
| 改 Firestore 權限 | `firestore.rules`，**然後重新檢查所有相關 `subscribeXxx` 的 query 收窄**（§13.5） |
| 改測試資料 | `scripts/seed-*.mjs`，帳號見 `docs/test-accounts.md`（`agent@test.com` 專給自動化用，方便單獨清理） |

---

## 16. 測試

| 層級 | 位置 | 跑法 |
|---|---|---|
| 後端單元測試（DSP／規則引擎） | `functions/src/ai/engine-audio/*.test.ts` | `cd functions && npm test`（`node:test`） |
| E2E | `tests/`、`playwright.config.ts` | `npm run test:e2e` |
| 型別 | — | `npm run build`（`vue-tsc -b`） |
| Lint | `eslint.config.js` | `npm run lint` |

現有後端測試覆蓋：`audio-decoder`、`audio-quality-analyzer`、`dft`、
`engine-event-detector`（冷）、`engine-event-detector-hot`（熱的 `assumeAlreadyRunning` 行為）、
`engine-hard-rule-evaluator`（冷）、`engine-hot-hard-rule-evaluator`（熱）、
`engine-result-resolver`、`transient-detector`。

測試帳號（全部密碼 `test1234`，詳見 `docs/test-accounts.md`）：
`admin@test.com`（後台）、`user1@test.com`、`user2@test.com`、`user3@test.com`、
`agent@test.com`（自動化專用）。
**沒有 buyer/seller/dealer 角色帳號**——角色是 `Verification.type`，不是帳號屬性。

---

_最後更新：2026-10-03。_
_本文描述的是 `develop` 分支當下（含未 commit 的 WIP）的實際狀態；_
_與程式衝突時以程式為準，並請順手更新本文。_
