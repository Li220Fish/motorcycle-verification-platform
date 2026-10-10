# MotoVerify（機車驗證平台）專案地圖

掃描日期：2026-10-02｜分支：`develop`（HEAD `f079761`, 2026-09-14）｜工作目錄另有大量未提交變更（見文末「git 歷程」）
掃描範圍：僅讀取程式碼/設定/docs/git，未執行任何會改動資料或對外呼叫的指令。

---

## 1. 專案用途（README 與程式碼交叉比對）

- **README.md 現狀過時**：`README.md:1-5` 自稱是「V0.1 technical skeleton」，宣稱「不實作真正的買賣家驗證流程」「Out of Scope: AI、市集、聊天」(`README.md:151-153`)。
- **實際程式碼遠超過 README 描述**：已存在完整的賣家/買家驗證流程（`src/data/verification/`）、AI 視覺/音訊/OCR 判讀（`functions/src/ai/`）、市集（`src/views/MarketplaceView.vue` 等）、聊天（`src/stores/chat.store.ts`, `src/views/ChatRoomView.vue`）、討論區、通知中心、營運後台（`src/admin/`）。
- **結論**：README 是早期骨架說明，**不可直接作為文件素材**，但可用來佐證「迭代式開發」—— 先驗證架構可行性（V0.1）再疊代擴充（V0.2+）。
- **【缺口】** 程式中找不到正式的「問題定義／既有做法比較」文字說明（例如為何中古機車交易需要第三方驗證、既有解法的痛點）。這類文字在 `docs/development-history.md` 的 2026-08-23〜24 business proposal 段落（`docs/development-history.md:13-62`）有部分討論，但該檔 517KB，建議團隊自行摘要，而非逐字搬入文件。

**完成度**：雛形（README）／實作已超前（程式碼）

---

## 2. 目錄結構與模組職責

```
src/
├── admin/              # 獨立的營運後台 SPA 區塊（/admin），自有 CSS，不共用 mobile app 元件
│   ├── sections/        # 17+ 頁後台子系統（Overview/Users/Verify/Market/Discussion/Messages/...）
│   └── services/        # admin-auth / admin-data / prompt-item-map
├── components/         # 依功能分資料夾：verification / marketplace / chat / discussion / common / home / media
├── views/               # 31 個路由對應頁面（見第 6 節路由表）
├── router/index.ts      # 單一路由表 + 全域 beforeEach 守衛（含 admin 專用守衛）
├── stores/              # Pinia：auth / vehicle / verification / probe / bluetooth / chat / discussion / notification / avatar / theme / upload-queue
├── services/
│   ├── firebase/         # Firestore/Auth/Storage 包裝
│   ├── probe/            # VoltageProbe 介面 + Mock/BLE 實作
│   ├── bluetooth/        # 通用 BLE 掃描/連線
│   ├── media/             # 相機照片/影片、錄音
│   ├── analysis/          # 電壓樣本分析
│   ├── motion/            # IMU 相關（前端）
│   ├── recognition/       # （待查用途）
│   ├── search/            # 搜尋
│   ├── chat/, discussion/, verification/  # 業務邏輯服務
│   └── platform/          # Web/Android/iOS 能力偵測
├── data/verification/   # 賣家/買家檢驗項目清單（S1-S11 / B1-B13）、AI 視覺項目、拍照位、結果文案
└── types/               # User / Vehicle / Verification / VoltageSession / Notification / DevLog / ListingAppointment

functions/src/           # Firebase Cloud Functions v2（「Trusted Backend」）
├── ai/
│   ├── gemini/            # Gemini Interactions API 客戶端 + cache
│   ├── prompts/           # 每個 AI 判定項目一支 prompt 檔 + registry.ts（後台可編輯的 prompt 目錄）
│   ├── providers/         # vision / audio inspection provider
│   ├── schemas/           # Gemini structured-output schema builder
│   └── engine-audio/      # 自建 DSP 管線：FFT/DFT、特徵擷取、事件偵測、Hard Rule evaluator（含多支 *.test.ts）
├── imu/                 # IMU 特徵擷取、穩定度分類、閾值設定
├── ocr/                 # OCR service（里程/行照）
├── video/               # ffmpeg/ffprobe 影片工具
├── functions/           # 對外 Callable / Firestore-trigger 入口（見第 6 節）
└── services/            # evidence / answer-writer / notification / push / cold-touch / engine-sensor-session / vehicle-registration 等
```

**完成度**：完成（結構清楚、模組邊界明確，`docs/admin-backend.md` 和程式內註解大量記錄了架構決策原因）

---

## 3. 入口點

| 入口 | 位置 | 說明 |
|---|---|---|
| Web/App 前端 | `src/main.ts` → `src/App.vue` | Vue 3 + Vue Router + Pinia |
| 路由總表 | `src/router/index.ts` | 31 條 mobile 路由 + 4 條 `/admin/*` 路由，全域 `beforeEach` 做驗證與 admin 守衛 |
| 營運後台 | `/admin`（`src/admin/AdminDashboardView.vue`） | 獨立 SPA 區塊，`src/router/index.ts:259-264` 用專屬守衛（非 `meta.requiresAuth`） |
| Cloud Functions 入口 | `functions/src/index.ts` | 集中 export 所有 Callable 與 Firestore-trigger function（見下表） |
| 原生殼 | `capacitor.config.ts` | `appId: com.motorcycleverify.app`，`webDir: dist`，Android/iOS 由 Capacitor 包裝同一份 Web bundle |

### Cloud Functions 清單（`functions/src/index.ts`）

**Callable（AI 判定）**
- `analyzeCoreVisionSides` / `analyzeCoreVisionRear` / `analyzeCoreVisionFrontSuspension` / `analyzeCoreVisionEngineBottom`（`functions/src/index.ts:12-17`，Core Vision v2 拆成 4 條獨立路由）
- `analyzeOcrDashboard`（儀表板里程 OCR）
- `analyzeEngineSensorSessionV2` / `analyzeHotEngineSensorSessionV2`（賣家冷啟動 / 買家熱車 引擎音訊+IMU 判定）
- `analyzeDocumentMaintenance`（保養文件）
- `analyzeColdEngineTouchCheck` / `retryColdEngineTouchCheck`（冷車觸感）
- `verifyVehicleRegistrationDocument`（行照 OCR）
- `getAiPromptCatalog`（後台「AI Prompt 設定」讀取用）

**Firestore-trigger（通知中心，`functions/src/index.ts:40-49`）**
- `onMessageCreated`, `onFavoriteCreated`, `onAppointmentCreated`, `onAppointmentStatusUpdated`, `onDiscussionCommentCreated`, `onDiscussionLikeCreated`, `onDiscussionPostCreated`, `onDiscussionPostFeatured`, `onVehicleNewsCreated`, `onSystemAnnouncementCreated`

**維運用**
- `onUserProfileUpdated`（同步聊天室顯示名稱）
- `adminSyncConversationMemberNames`（一次性回補腳本）
- `adminRestoreEvidenceRemoteUrl`

**完成度**：完成（有明確 export 清單與逐一註解說明「為何存在/取代了誰」，例如 `analyzeCoreVisionV2` 已被拆分、`retryCoreVisionV2Item` 已刪除）

---

## 4. 技術堆疊

### 前端（`package.json`）
- Vue 3.5 + Vue Router 5 + Pinia 4（Composition API）
- Vite 8 + TypeScript（`vue-tsc` type-check 於 build 時執行）
- Capacitor 8（`@capacitor/android`, `@capacitor/ios`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/push-notifications`, `@capacitor/preferences`）
- `@capacitor-community/bluetooth-le`（BLE）、`@capawesome/capacitor-torch`（手電筒，用於強制開燈拍照）、`capacitor-voice-recorder`（錄音）
- `firebase` SDK 12.18（client-only，無 Admin SDK）
- `lucide-vue-next`（icon）

### 後端（`functions/package.json`）
- Firebase Functions v2 + Firebase Admin SDK 12.7（Node 22）
- `@google/genai` 2.21（Gemini Interactions API 客戶端，`functions/src/ai/gemini/client.ts`）
- `sharp` 0.33（影像處理）、`@ffmpeg-installer/ffmpeg` + `@ffprobe-installer/ffprobe`（影片處理，`functions/src/video/`）
- 自建 DSP：FFT/DFT、音訊事件偵測、Hard Rule evaluator（`functions/src/ai/engine-audio/`，附 `.test.ts` 單元測試）

### AI 模型
- **唯一模型來源：Google Gemini**，型號由 `functions/src/config.ts:2` 集中管理：`GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'`
- API 金鑰透過 Firebase Functions v2 Secret Manager 綁定（`GEMINI_API_KEY_SECRET`，`functions/src/config.ts:4-6`），不落地在程式碼或 Firestore
- **掃描結果：未發現任何 DeepSeek / Qwen / 文心一言 / 智譜 / 阿里雲 / 騰訊 等中國或中資來源的模型或 API**（已用 grep 全庫搜尋相關關鍵字，`No files found`）→ **無違規風險**
- AI 判定項目一覽（`functions/src/ai/prompts/registry.ts:26-90`）：全域檢驗規則前綴、核心影像判定（左右側/車尾對稱/前避震/引擎底部）、儀表板里程 OCR、冷車觸感、引擎啟動/怠速/油門音訊（DSP+Gemini）、買家熱車音訊判定、行照 OCR —— 每個 key 同時是後台「Prompt 設定」可編輯的 Firestore 文件 id
- 影像/音訊送 Gemini 前會先跑過**自建 DSP 前處理管線**（FFT 特徵、Hard Rule），Gemini 只負責解讀，不是裸接 API（`functions/src/ai/prompts/registry.ts:66-70` 註解明確說明）

### 資料庫 / 儲存 / 部署
- Firestore（asia-east1）+ Storage（US multi-region，Blaze plan）＋ Firebase Auth（Email/Password）
- `firestore.rules`（39534 bytes，v1.0，見 `docs/firestore-v1-implementation-report.md`）：**default-deny**，除了明確授權的 collection 外一律拒絕
- Firebase Hosting 部署前端；Cloud Functions v2 部署後端
- `firestore.indexes.json`、`storage.rules`、`storage.cors.json` 皆存在並有對應設定

**完成度**：完成（技術選型與版本可完整查證）
**缺口**：README 列的 Node 版本需求（22.18+/24.11+）與 `functions/package.json` 的 `engines.node: "22"` 一致，但未見 CI 設定檔案（`.github/` 不在根目錄列表中）— **【程式中查無，需團隊補充】是否有 CI/CD pipeline**。

---

## 5. 角色與權限（`firestore.rules`）

- **使用者帳號不分買家/賣家類型**：`src/types/user.ts` 的 `User` interface 只有 `id/email/displayName/photoUrl/createdAt/updatedAt`，買家/賣家是行為角色而非帳號類型（`README.md:147`、`src/types/verification.ts:1` 的 `VerificationType = 'seller' | 'buyer' | 'professional'` 印證）。
- **一般使用者**：Firebase Auth Email/Password 登入後即為 signed-in user，依 `ownsVehicle()` / `resource.data.xxxId == myUid()` 等規則限制讀寫自己的車輛/驗車/對話/收藏等（`firestore.rules:68-115` 等）。
- **管理員（Admin）**：**寫死單一 uid** 於 `isAdmin()`（`firestore.rules:64-66`：`myUid() == 'CMWrmo2pHsRiBu5kMj1CDJ23xd72'`），而非可由前端寫入的 `admins/{uid}` 白名單 collection —— 註解明確說明原因：任何允許寫入白名單的規則都等於讓任何登入者可自我授權為 admin（`firestore.rules:53-63`）。要新增管理員必須改規則並重新部署，**無「新增管理員」的後台功能**。
- **Trusted Backend（Cloud Functions / Admin SDK）**：繞過所有 Firestore 規則，但規則本身仍阻擋**前端直接寫入** AI 判定欄位（如 `answers/{itemId}.aiResult`），確保 AI 結果的可信度來自「只有後端能寫」而非單純的前後端分離（`firestore.rules:29-33`）。
- **Admin 登入方式**：前台輸入字面值 `test`/`test`，背後換成真實 Firebase Auth 帳號 `admin@test.com`（`docs/admin-backend.md:11-22`），確保 Firestore 規則看到的是真實已驗證 session。

**完成度**：完成
**缺口**：僅有「一般使用者」與「單一管理員」兩種角色，**無多管理員/分級權限**——若文件要寫「角色與權限管理」章節，需誠實說明這是刻意的單帳號設計，而非功能缺失。

---

## 6. 畫面與功能清單（路由 → 完成度）

依 `src/router/index.ts` 全部 31 條 mobile 路由 + 4 條 admin 路由：

| 路由 | 畫面 | 功能類別 |
|---|---|---|
| `/login` | LoginView | 登入 |
| `/dashboard` | DashboardView | 首頁 |
| `/vehicles`, `/vehicles/:id` | VehiclesView, VehicleDetailView | 車輛管理 |
| `/verification`, `/verification/:id`, `/verification/:id/result`, `/verification/:id/comparison`, `/verification/:id/report`, `/verification/:id/share` | Verification* | 驗車流程（開始→步驟→結果→買賣家比對→報告→分享） |
| `/probe` | ProbeView | BLE 電壓探針（Mock + 真實裝置） |
| `/marketplace`, `/marketplace/:id`, `/marketplace/:id/report` | Marketplace* | 市集瀏覽/刊登詳情/檢舉 |
| `/reports` | ReportsView | 報告列表 |
| `/my-listings`, `/my-listings/:id` | MyListings* | 我的刊登管理 |
| `/settings` + 5 子頁 | Settings* | 帳號/通知/偏好/隱私/關於 |
| `/messages`, `/messages/:conversationId` | Messages, ChatRoom | 即時聊天 |
| `/notifications` | NotificationsView | 通知中心 |
| `/discussion`, `/discussion/compose`, `/discussion/:postId` | Discussion* | 討論區（發文/留言/按讚） |
| `/vehicle-news/:newsId` | VehicleNewsView | 車輛新聞 |
| `/discussion/vehicle-knowledge/:modelId` | VehicleKnowledgeDetailView | 車型知識 |
| `/admin/*` | AdminDashboardView（17+ sections） | 營運後台 |
| `/dev-log` | DevLogView | 團隊自用開發日誌（非終端使用者功能） |

### 核心功能：驗車流程（完成度最高、最適合當主要截圖/Demo）
- 170 項原始檢驗項目 → 拆分為 **Seller 流程（S1-S11）** 與 **Buyer 複驗流程（B1-B13）**，逐項可追溯對應關係，見 `docs/verification-coverage.md`（170/170 全部有對應，4 個缺口已在開發中補齊）。
- AI 自動判讀涵蓋：外觀對稱性（車尾單張照片判定，依 memory 記錄為近期改動）、前避震、引擎底部、冷車觸感、引擎啟動/怠速/油門聲音（DSP+Gemini）、儀表板里程 OCR、行照 OCR、保養文件。
- 買家複驗會與對應賣家驗車紀錄做「比對」（`VerificationComparisonView.vue`），並可產生可分享的公開報告（`isPublic` 欄位一經翻轉即不可逆，`src/types/verification.ts:64-68`）。
- Cloud Function 層對每個 AI 呼叫都有 `processing/completed/failed` 狀態追蹤（`AnalysisStatusMap`，`src/types/verification.ts:28-41`），修正了舊版「AI 呼叫失敗但前端完全無感知」的問題。

### 營運後台（`src/admin/`，見 `docs/admin-backend.md`）
- 子系統：Overview（總覽）、Users/UserDetail、Garage（車輛）、Verify/VerifyDetail（驗車紀錄）、Market（市集）、Discussion（討論區管理）、Messages（聊天監看）、Models（車款主檔）、News（車輛新聞）、Notifications、Behaviour（行為分析）、Reports（報告品質）、HealthCheck + HealthCheckAnnotation（基本健檢標記，可依車款個別標註）、Prompts（AI prompt 線上編輯，對應 `functions/src/ai/prompts/registry.ts`）、Probe（電壓探針監看）
- **誠實揭露的已知缺口**（`docs/admin-backend.md:60-98`，非猜測）：
  1. 無任何使用者行為埋點 → 熱力圖/漏斗/留存分析頁面顯示真實但是空的查詢結果，**不是編造數據**
  2. 無登入歷史紀錄，次日/7日/30日留存無法重建
  3. 電壓探針遙測完全未串接（`voltageSessionService` 存在但沒人呼叫）
  4. 刊登沒有 active/pending/sold 狀態欄位
  5. 驗車品質無法按電系/車身/引擎細分（需額外彙總工程）
  6. 賣家回覆率、疑似電動車、里程異常 —— 部分是真實推論（里程異常），部分是字串比對 heuristic（電動車），回覆率甚至還沒做

**完成度**：驗車核心流程＝完成；後台管理＝完成（含誠實的 empty-state 設計，非雛形）；行為分析/留存＝雛形（UI 存在，資料源缺失）

---

## 7. 系統特色（程式可查證的差異化設計）

1. **AI 判定前先跑自建 DSP 管線**，Gemini 只做語意/異常解讀，不是單純丟原始音訊給大模型猜（`functions/src/ai/engine-audio/`：FFT/DFT、音質分析、事件偵測、Hard Rule evaluator，皆有對應 `.test.ts`）。
2. **AI 結果的信任邊界由 Firestore 規則保證**，而非僅靠「前端不呼叫」的君子協定——`answers/{itemId}.aiResult` 欄位規則明確阻擋 client 寫入（`firestore.rules` 註解 `:29-33`）。
3. **後台 Prompt 可線上編輯**（`functions/src/ai/prompts/registry.ts` + `getAiPromptCatalog`），不需改程式碼部署即可調整 AI 判定邏輯文字。
4. **硬體策略簡化且有文件記錄**：原始 170 項規格設想專用機車探針（含 IR 溫度、震動 FFT 通道），V0.2 改用「電壓探針（唯一專用硬體）+ 手機麥克風（聲音）+ 手機 IMU（震動）+ 手或 App SOP（冷車觸感）」，每一項替代都在 `docs/verification-coverage.md:198-200` 有文件化的架構理由，不是功能遺漏。
5. **驗證不可逆公開機制**：`Verification.isPublic` 一旦為 true 永不可逆轉，即使 admin 也不能改寫已公開的驗車紀錄（`firestore.rules` 註解提及這是「整個公開報告功能的保證」）。
6. **Mock Probe 架構可平滑切換真實硬體**：`VoltageProbe` 介面抽象化，之後接真實 BLE 探針只需實作 `ble-probe.service.ts`，無需改動其他程式碼（`README.md:111`）。

**完成度**：完成（均可在程式碼中直接驗證）
**缺口**：**【程式中查無，需團隊補充】** 任何量化指標（AI 判定準確率、處理延遲、成本、使用人數）——程式中無 benchmark/評測腳本或埋點數據可佐證，文件中這類數字必須由團隊提供真實測試結果，不可引用本報告。

---

## 8. 使用環境與安裝（以 README 為準，已核對 package.json 版本）

- Node.js 22.18+（或 24.11+）／npm 11+（`README.md:9-10`，與 `functions/package.json` 的 `engines.node: "22"` 一致）
- Android 建置需 Android Studio/SDK + `ANDROID_HOME`；iOS 建置需 macOS + Xcode（`README.md:11-12`）
- 環境變數（僅列名稱，不含值，`.env.example`）：`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- 後端另需 Secret Manager 中的 `GEMINI_API_KEY`（不落地在 `.env`）
- 安裝：`npm install` → `npm run dev`（Web）／`npm run cap:sync && npm run cap:android|cap:ios`（原生）
- Firebase 專案：`motorcycle-verification`（Firestore asia-east1、Storage US multi-region、Blaze 方案）

**完成度**：完成

---

## 9. 測試與驗證

- `tests/e2e/verification-regression.spec.ts`、`tests/e2e/social-realtime.spec.ts`（Playwright，`playwright.config.ts`）
- `functions/src/ai/engine-audio/*.test.ts`（Node 原生 test runner，`npm test` in `functions/`：涵蓋 audio-decoder、audio-quality-analyzer、dft、engine-event-detector（含 hot 版本）、engine-hard-rule-evaluator（含 hot 版本）、engine-result-resolver）
- `docs/verification-coverage.md`：170 項原始檢驗規格 vs 實作的逐項稽核報告（人工比對，非自動化測試，但是嚴謹的覆蓋率稽核文件）
- `docs/firestore-v1-audit-report.md` / `firestore-v1-implementation-report.md`：規則遷移的稽核與實作記錄

**完成度**：完成（有實質測試檔案，非空殼）
**缺口**：未見前端 Vue 元件的單元測試（僅 e2e + 後端函式單元測試）；**【程式中查無，需團隊補充】** 測試覆蓋率數字、CI 自動跑測試的證據。

---

## 10. Git 歷程（佐證迭代式開發）

- 專案起始：2026-08-26（Initial commit）；`develop` 分支現有 52 commits，`backstage` 分支 43 commits，`main` 分支僅 1 commit（刻意落後，`main` 可能是穩定/展示分支，`develop`/`backstage` 才是主力開發線）
- 最新 commit（`develop` HEAD，2026-09-14）之後，**工作目錄仍有大量未提交變更**（`git status` 顯示 60+ 個檔案 `M`，涵蓋 Android 設定、Firestore 規則、AI prompts、多個 admin/view 元件）—— 顯示截至掃描當下（2026-10-02）仍在高頻迭代中。
- `docs/development-history.md`（517KB，截至目前已知記錄到 2026年9月8日附近，可能更新，檔案過大未逐行讀完）逐日記錄：業務提案版本迭代（v0.1→v0.3）、硬體研究、Gemini 引擎分析驗證、Firebase 架設、流程步驟驗證、AI 驗車功能串接等——是「敏捷/迭代式開發」的直接文字證據，而非僅靠 commit 訊息推測。
- commit 訊息風格：中文、動詞開頭（`feat:` / `fix:`），例如「基本12項健檢改為長按打勾/打叉」「驗車開始前新增一次性使用導覽」等，顯示持續根據測試回饋修正 UX 細節。

**完成度**：完成（可直接佐證迭代式開發節奏）

---

## 11. 結語／擴充方向線索

- `src/admin/services/prompt-item-map.ts` + `registry.ts` 的「後台可編輯 Prompt」設計本身就是一個**為未來擴充預留的 plugin 點**：新增 AI 判定項目只需新增 prompt 檔並註冊到 `AI_PROMPT_REGISTRY`，即自動變成後台可編輯項目。
- `docs/admin-backend.md` 的「已知缺口」章節（第 6 節引用）實質上就是團隊自己寫下的 roadmap：事件埋點、登入歷史、探針遙測串接、刊登狀態欄位、驗車品質細分、賣家回覆率計算。
- `src/types/verification.ts:74`：`expiresAt?: number` 欄位「Reserved for future validity-window rules (§43) — not enforced in V0.2」，是明確的預留擴充欄位。
- Capacitor 架構代表 Web/Android/iOS 三平台已經是同一份程式碼基礎，新增平台功能的邊際成本已經被 V0.1 的架構驗證證明可控。

**完成度**：完成（roadmap 線索直接來自程式註解與 docs，非推測）

---

## 待團隊補充清單

1. 問題定義章節需要的「使用者痛點」「市場既有方案比較」文字素材（程式中僅有零散的 commit/業務提案記錄，建議團隊自行撰寫一段清楚的問題陳述）。
2. 任何量化指標：AI 判定準確率、處理延遲、API 成本、使用者數/活躍數（程式中完全無此類數據來源，後台本身也誠實顯示「無資料」而非造假）。
3. 是否有 CI/CD pipeline（repo 根目錄未見 `.github/workflows` 等檔案，需團隊確認）。
4. 匿名原則提醒：**此份地圖掃描過程中未發現校名/指導老師/成員姓名寫死在程式碼或 docs 中**，但 `docs/` 內多篇文件（如 development-history.md）可能含團隊內部討論細節，正式文件引用前建議人工複查一次是否有需要匿名化的內容。
5. `docs/development-history.md` 檔案過大（517KB）未逐行讀完，只掃過標題目錄到 2026-09-08 附近；若文件需要更完整的逐日開發歷程，建議團隊直接摘錄該檔案而非仰賴本報告。

## 可直接撰寫的文件段落 vs 還不行

| 段落 | 狀態 |
|---|---|
| 創意描述 | 可寫（第 1、7 節素材足夠） |
| 系統功能簡介 | 可寫（第 6 節有逐路由清單+完成度） |
| 系統特色 | 可寫但不可加量化數字（第 7 節） |
| 系統開發工具與技術 | 可寫（第 4 節，含 AI 模型合規確認） |
| 系統使用對象 | 可寫但角色很簡單，需誠實呈現（第 5 節） |
| 系統使用環境 | 可寫（第 8 節） |
| 前言（問題定義） | **不行**——需團隊補充痛點與既有方案比較 |
| 結語 | 可寫（第 11 節），但量化成效仍需團隊補充
