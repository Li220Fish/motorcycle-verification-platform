# MotoVerify 機車驗證平台 — 功能開發與討論紀錄

> 本文件彙整專案開發至今所有已記錄的功能開發（Git commit）與規劃討論（工作日誌／團隊規劃表），依時間先後排序。每筆紀錄套用專案「開發日誌」功能的工作記錄範本欄位（使用者／時間／分類／類型／Prompt／摘要／產出程式碼／結果／時數），資料來源：`src/data/dev-log.json`。

**統計**：共 85 筆紀錄・Git commit 40 筆・工作日誌 16 筆・團隊規劃表 29 筆
**參與者工時**：li220fish（71 工時）・jefferylu33（8 工時）・Archi（48 工時）
**分類分布**：系統 36・檢定辨識 9・前台 21・後台 8・開發管理 11

---

## 2026年8月23日 週日

### 業務提案 v0.1：資訊架構定義

- 使用者：Archi
- 時間：2026-08-23
- 分類：系統
- 類型：設計

#### Prompt
我們正在設計一個手機的機車檢驗程市及中古交易平台，這邊是我同學畫的架構圖，先幫我設計出這個程式在各個頁面上的示意畫面…在主畫面我這邊的想法是，讓使用者能在畫面中第一眼發現到的是自己感興趣的車輛…

#### 摘要
從初版 UI 畫面討論演變為完整商業提案的第一步：定義首頁六大區塊排序、五分頁底部導覽、訊息與討論中心的計數邏輯。

#### 結果
✅ 資訊架構定義完成
交付物：視覺原型（Artifact: home_block_order_and_tab_bar）
- 首頁六大區塊排序（我的車 → 待辦提醒 → 快速記錄 → 我的刊登 → 感興趣的車輛 → 新知）
- 五分頁底部導覽重排（首頁 | 市場 | 檢驗 | 訊息 | 討論中心）
關鍵決策：我的帳號頁挪至首頁右上角頭像入口／待辦提醒固定第二區塊／快速記錄需 15 秒內完成／訊息與討論中心各自計數邏輯

#### 時數
1.5

---

## 2026年8月24日 週一

### 業務提案 v0.2：商業模式全面成形

- 使用者：Archi
- 時間：2026-08-24 ～ 2026-08-29
- 分類：系統
- 類型：設計

#### Prompt
你重新寫一個商業提案計劃跟目前有疑慮的問題全部列清單出來

#### 摘要
使用者要求從初版 UI 設計轉向完整商業計畫，清點開放問題並提出初版假設。產出十大功能商業模式畫布、市場規模評估、收入模型初版與海外擴張評估。

#### 結果
⚠️ 識別出四個硬問題（檢驗員來源／裁判兼球員、檢驗費定價、灰標可信度、冷啟動範圍）
交付物：MotoVerify-Proposal-v0.2.docx
關鍵發現：確認紅海判定（交易流量、車況記錄均無護城河）／識別真空地帶（機車第三方檢驗市場基本沒有）／經濟性風險（3萬元車收2,500檢驗費=8%成本）／信任機制漏洞（灰標自填紀錄無法驗證）

#### 時數
4

---

### 工作分配與需求

- 使用者：li220fish
- 時間：2026-08-24 ～ 2026-08-25
- 分類：系統
- 類型：討論

#### 摘要
確認團員分工與負責項目

#### 結果
驗證完成，功能確定上線（結案：2026-08-25）

#### 時數
6

---

## 2026年8月25日 週二

### 硬體研究

- 使用者：jefferylu33
- 時間：2026-08-25
- 分類：檢定辨識
- 類型：開發

#### 摘要
處理可持續測量電壓之電表（帶有藍芽功能）

#### 結果
需求已確定，等待實作

#### 時數
2.5

---

### Gemini 引擎分析驗證

- 使用者：Archi
- 時間：2026-08-25 ～ 2026-08-26
- 分類：檢定辨識
- 類型：測試

#### 摘要
驗證 AI agent 對於引擎聲音辨識效果

#### 結果
驗證完成，功能確定上線（結案：2026-08-26）

#### 時數
0.5

---

## 2026年8月26日 週三

### 軟體開發方向

- 使用者：li220fish
- 時間：2026-08-26 ～ 2026-08-27
- 分類：系統
- 類型：開發

#### 摘要
要做 android、ios APP 或是直接用 Web APP

#### 結果
驗證完成，功能確定上線（結案：2026-08-27）

#### 時數
1.5

---

### Web + Native APP 開發

- 使用者：li220fish
- 時間：2026-08-26
- 分類：系統
- 類型：開發

#### 摘要
整體架構與功能開發

#### 結果
實作中，需求尚未完成

#### 時數
36

---

### 架設 Firebase

- 使用者：li220fish
- 時間：2026-08-26
- 分類：系統
- 類型：開發

#### 摘要
架設 Firebase 公網 web app 與 DB

#### 結果
實作中，需求尚未完成

#### 時數
1

---

### Initial commit `ba6d7a4`

- 使用者：li220fish
- 時間：2026-08-26 19:28
- 分類：系統
- 類型：其他

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/README.md b/README.md
new file mode 100644
index 0000000..63b8325
--- /dev/null
+++ b/README.md
@@ -0,0 +1,2 @@
+# motorcycle-verification-platform
+A cross-platform motorcycle verification platform for sellers and buyers. Built with Vue, Capacitor, Firebase, and BLE integration, it supports vehicle records, verification history, photo/video evidence, buyer re-verification, and a custom voltage probe for objective electrical measurements.
```

</details>

#### 結果
已提交 commit ba6d7a4

---

## 2026年8月27日 週四

### 流程步驟驗證

- 使用者：li220fish
- 時間：2026-08-27
- 分類：前台
- 類型：開發

#### 摘要
確保填寫內容正常

#### 結果
需求已完成，等待其他成員／外人驗證

#### 時數
2.5

---

### 基礎架構版(android設備連接正常) `577862f`

- 使用者：li220fish
- 時間：2026-08-27 12:04
- 分類：系統
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/.env.example b/.env.example
new file mode 100644
index 0000000..23f7e25
--- /dev/null
+++ b/.env.example
@@ -0,0 +1,6 @@
+VITE_FIREBASE_API_KEY=
+VITE_FIREBASE_AUTH_DOMAIN=
+VITE_FIREBASE_PROJECT_ID=
+VITE_FIREBASE_STORAGE_BUCKET=
+VITE_FIREBASE_MESSAGING_SENDER_ID=
+VITE_FIREBASE_APP_ID=
diff --git a/.firebaserc b/.firebaserc
new file mode 100644
index 0000000..fdc2615
--- /dev/null
+++ b/.firebaserc
@@ -0,0 +1,5 @@
+{
+  "projects": {
+    "default": "motorcycle-verification"
+  }
+}
diff --git a/.gitignore b/.gitignore
new file mode 100644
index 0000000..1a94a08
--- /dev/null
+++ b/.gitignore
@@ -0,0 +1,32 @@
+# Logs
+logs
+*.log
+npm-debug.log*
+yarn-debug.log*
+yarn-error.log*
+pnpm-debug.log*
+lerna-debug.log*
+
+node_modules
+dist
+dist-ssr
+*.local
+
+# Environment
+.env
+.env.*.local
+
+# Firebase CLI
+firebase-debug.log
+.firebase/
+
+# Editor directories and files
+.vscode/*
+!.vscode/extensions.json
+.idea
+.DS_Store
+*.suo
+*.ntvs*
+*.njsproj
+*.sln
+*.sw?
diff --git a/.prettierignore b/.prettierignore
new file mode 100644
index 0000000..67904b1
--- /dev/null
+++ b/.prettierignore
@@ -0,0 +1,4 @@
+dist
+android
+ios
+node_modules
diff --git a/.prettierrc.json b/.prettierrc.json
new file mode 100644
index 0000000..8fc6342
--- /dev/null
+++ b/.prettierrc.json
@@ -0,0 +1,7 @@
+{
+  "semi": false,
+  "singleQuote": true,
+  "printWidth": 100,
+  "trailingComma": "all",
+  "arrowParens": "always"
+}
diff --git a/.vscode/extensions.json b/.vscode/extensions.json
new file mode 100644
index 0000000..a7cea0b
--- /dev/null
+++ b/.vscode/extensions.json
@@ -0,0 +1,3 @@
+{
+  "recommendations": ["Vue.volar"]
+}
diff --git a/README.md b/README.md
index 63b8325..a8d5b52 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,153 @@
-# motorcycle-verification-platform
-A cross-platform motorcycle verification platform for sellers and buyers. Built with Vue, Capacitor, Firebase, and BLE integration, it supports vehicle records, verification history, photo/video evidence, buyer re-verification, and a custom voltage probe for objective electrical measurements.
+# Motorcycle Verification Platform — V0.1
+
+A cross-platform motorcycle verification platform for sellers and buyers. This is the **V0.1 technical skeleton**: a single Vue 3 codebase that runs on Web, Android, and iOS via Capacitor, backed by Firebase (Auth, Firestore, Storage), with a Bluetooth BLE voltage-probe abstraction (Mock Probe included) and a basic voltage analysis service.
+
+This version does **not** implement the real seller/buyer verification flow. Its only goal is to prove the architecture works end-to-end before that flow is designed.
+
+## Requirements
+
+- Node.js 22.18+ (or 24.11+)
+- npm 11+
+- For Android builds: Android Studio / Android SDK, `ANDROID_HOME` configured
+- For iOS builds: macOS with Xcode (not required for V0.1 — see [Capacitor](#capacitor))
+
+## Install
+
+```bash
+npm install
+```
+
+## Web
+
+```bash
+npm run dev
+```
+
+Opens the Vite dev server. All routes (`/login`, `/dashboard`, `/vehicles`, `/vehicles/:id`, `/verification`, `/probe`, `/settings`) are reachable once logged in.
+
+## Build
+
+```bash
+npm run build
+```
+
+Type-checks with `vue-tsc` and builds a production bundle to `dist/`.
+
+## Lint / Format
+
+```bash
+npm run lint
+npm run format
+```
+
+## Capacitor
+
+```bash
+npm run cap:sync
+```
+
+Builds the web app and copies it into the native `android/` and `ios/` projects.
+
+### Android
+
+```bash
+npm run cap:android
+```
+
+Opens the project in Android Studio. Requires `android/local.properties` with a valid `sdk.dir` (Android Studio creates this automatically the first time it opens the project; alternatively set the `ANDROID_HOME` environment variable).
+
+### iOS
+
+```bash
+npm run cap:ios
+```
+
+Opens the project in Xcode. **Building iOS requires macOS.** On other platforms, the `ios/` project structure is still generated and kept in the repo — it just can't be compiled locally.
+
+## Firebase
+
+Project: **motorcycle-verification** (Firestore: asia-east1, Storage: US multi-region, Blaze plan).
+
+Copy `.env.example` to `.env` and fill in the project's Web App config (Firebase Console → Project Settings → General → Your apps → look for "Motorcycle Verification Web"):
+
+```bash
+VITE_FIREBASE_API_KEY=
+VITE_FIREBASE_AUTH_DOMAIN=
+VITE_FIREBASE_PROJECT_ID=
+VITE_FIREBASE_STORAGE_BUCKET=
+VITE_FIREBASE_MESSAGING_SENDER_ID=
+VITE_FIREBASE_APP_ID=
+```
+
+`.env` is git-ignored — never commit real credentials. Never commit an Admin SDK service account JSON either; it's a server-side secret, unrelated to the values above, and must never be embedded in this frontend app.
+
+Setup status — all three verified end-to-end (register → login → create/list Vehicle → create Verification → upload/delete a Storage object → cleanup):
+
+- ✅ Firestore Database (asia-east1), `firestore.rules` + `firestore.indexes.json` deployed
+- ✅ Authentication — Email/Password sign-in enabled
+- ✅ Storage (US multi-region, Blaze plan) — `storage.rules` deployed
+
+Both Authentication and Storage had to be enabled once through the Firebase Console by the project owner (Storage specifically required attaching a Blaze billing plan — as of late 2024 Google requires this even for zero-cost usage; the free quota, 5GB storage + 1GB/day download, comfortably covers V0.1 testing).
+
+### Deploying rules
+
+```bash
+npx firebase-tools deploy --only firestore   # rules + indexes
+npx firebase-tools deploy --only storage     # rules (after Storage is enabled in Console)
+```
+
+## Mock Probe
+
+The BLE voltage probe hardware may not exist yet, so V0.1 defaults to a **Mock Probe** (`src/services/probe/mock-probe.service.ts`) that simulates realistic voltage readings without any hardware:
+
+1. Go to `/probe`.
+2. **Connect** — simulates a BLE connection.
+3. **Start** — begins emitting a voltage sample every 100ms (resting ~12.6V).
+4. **Simulate Engine Start** — voltage dips (~9.8–10.4V, simulating the starter motor), then automatically rises to charging voltage (~13.8–14.1V) after ~1.5s.
+5. **Stop** / **Disconnect** — as expected.
+
+The page shows live connection state, current voltage, sample count, min/max/average analysis, and the last 20 samples.
+
+Swapping to a real probe later only requires implementing `src/services/probe/ble-probe.service.ts` against the `VoltageProbe` interface — no other code changes.
+
+## Real Device Hardware (BLE / Camera / Microphone)
+
+These require the native Android/iOS app (or a browser that supports the underlying Web API) — they don't work in every environment, and each capture UI shows its own errors when a device doesn't support something:
+
+- **Bluetooth device list** (`/probe` → "Bluetooth Devices") — scans for nearby BLE devices, lists paired devices (Android), and lets you connect/disconnect. This is a general BLE capability test, independent from the Mock/BLE Probe above (which is for the eventual voltage-probe protocol specifically — no real hardware or GATT UUIDs are defined for it yet). Uses `@capacitor-community/bluetooth-le`.
+- **Camera — photo & video** (Vehicle Detail page → "Media Capture Test") — `Camera.takePhoto()` works everywhere including Web. `Camera.recordVideo()` is native-only (`@capacitor/camera` has no Web video support); on Web the component falls back to a native file-picker capture input. Uses `@capacitor/camera`.
+- **Microphone recording** (same section) — start/stop recording, playback in-app, upload to Storage. Works on Web, Android, and iOS. Uses `capacitor-voice-recorder`.
+
+All three upload their captured result straight to Firebase Storage and show the resulting URL, reusing `storageService`.
+
+## Project Structure
+
+```text
+src/
+├── components/
+│   ├── common/              # Shared UI (PageHeader, etc.)
+│   └── media/                # PhotoCapture / VideoCapture / AudioRecorder
+├── layouts/                # AppLayout (header + sidebar/bottom nav + content)
+├── views/                  # One placeholder view per route
+├── router/                 # Routes + auth guard
+├── stores/                 # Pinia stores (auth, vehicle, verification, probe, bluetooth)
+├── services/
+│   ├── firebase/            # Firebase SDK wrapper (auth/vehicle/verification/storage/voltage-session)
+│   ├── probe/                # VoltageProbe interface, Mock + BLE implementations, facade
+│   ├── bluetooth/            # General BLE device scan/connect wrapper
+│   ├── media/                 # Camera photo/video + audio recording wrappers
+│   ├── analysis/             # Voltage sample analysis
+│   └── platform/             # Web/Android/iOS capability detection
+├── types/                  # Domain types (User, Vehicle, Verification, VoltageSession)
+└── App.vue / main.ts
+```
+
+## Data Model Notes
+
+- **User is not split into Buyer/Seller accounts.** The same person can be a buyer today and a seller tomorrow — buyer/seller are behavioral roles, not account types.
+- **Verification belongs to Vehicle, not to a person.** Every `Verification` document carries a `vehicleId`; a vehicle accumulates verifications over its lifetime (2026, 2027, 2028, ...) regardless of who performed them.
+- **Raw voltage samples are not written to Firestore.** Only a `VoltageSession` summary (`minVoltage`/`maxVoltage`/`averageVoltage`) is persisted. High-frequency raw samples stay in memory for the current session — see `src/services/firebase/voltage-session.service.ts` and `src/stores/probe.store.ts`.
+
+## Out of Scope for V0.1
+
+Full seller/buyer verification flows, the 100+ item checklist, production UI/UX, AI, condition scoring, marketplace, chat, payments, maps, the real voltage-probe BLE hardware/protocol, ECU/IR/external-microphone/IMU diagnostic sensors. (Built-in phone Bluetooth/camera/microphone capability tests — see above — are in scope; external/specialized sensor hardware is not.) These are intentionally deferred to later versions.
diff --git a/android/.gitignore b/android/.gitignore
new file mode 100644
index 0000000..48354a3
--- /dev/null
+++ b/android/.gitignore
@@ -0,0 +1,101 @@
+# Using Android gitignore template: https://github.com/github/gitignore/blob/HEAD/Android.gitignore
+
+# Built application files
+*.apk
+*.aar
+*.ap_
+*.aab
+
+# Files for the ART/Dalvik VM
+*.dex
+
+# Java class files
+*.class
+
+# Generated files
+bin/
+gen/
+out/
+#  Uncomment the following line in case you need and you don't have the release build type files in your app
+# release/
+
+# Gradle files
+.gradle/
+build/
+
+# Local configuration file (sdk path, etc)
+local.properties
+
+# Proguard folder generated by Eclipse
+proguard/
+
+# Log Files
+*.log
+
+# Android Studio Navigation editor temp files
+.navigation/
+
+# Android Studio captures folder
+captures/
+
+# IntelliJ
+*.iml
+.idea/workspace.xml
+.idea/tasks.xml
+.idea/gradle.xml
+.idea/assetWizardSettings.xml
+.idea/dictionaries
+.idea/libraries
+# Android Studio 3 in .gitignore file.
+.idea/caches
+.idea/modules.xml
+# Comment next line if keeping position of elements in Navigation Editor is relevant for you
+.idea/navEditor.xml
+
+# Keystore files
+# Uncomment the following lines if you do not want to check your keystore files in.
+#*.jks
+#*.keystore
+
+# External native build folder generated in Android Studio 2.2 and later
+.externalNativeBuild
+.cxx/
+
+# Google Services (e.g. APIs or Firebase)
+# google-services.json
+
+# Freeline
+freeline.py
+freeline/
+freeline_project_description.json
+
+# fastlane
+fastlane/report.xml
+fastlane/Preview.html
+fastlane/screenshots
+fastlane/test_output
+fastlane/readme.md
+
+# Version control
+vcs.xml
+
+# lint
+lint/intermediates/
+lint/generated/
+lint/outputs/
+lint/tmp/
+# lint/reports/
+
+# Android Profiling
+*.hprof
+
+# Cordova plugins for Capacitor
+capacitor-cordova-android-plugins
+
+# Copied web assets
+app/src/main/assets/public
+
+# Generated Config files
+app/src/main/assets/capacitor.config.json
+app/src/main/assets/capacitor.plugins.json
+app/src/main/res/xml/config.xml
diff --git a/android/app/.gitignore b/android/app/.gitignore
new file mode 100644
index 0000000..043df80
--- /dev/null
+++ b/android/app/.gitignore
@@ -0,0 +1,2 @@
+/build/*
+!/build/.npmkeep
diff --git a/android/app/build.gradle b/android/app/build.gradle
new file mode 100644
index 0000000..48ecdca
--- /dev/null
+++ b/android/app/build.gradle
@@ -0,0 +1,54 @@
+apply plugin: 'com.android.application'
+
+android {
+    namespace = "com.motorcycleverify.app"
+    compileSdk = rootProject.ext.compileSdkVersion
+    defaultConfig {
+        applicationId "com.motorcycleverify.app"
+        minSdkVersion rootProject.ext.minSdkVersion
+        targetSdkVersion rootProject.ext.targetSdkVersion
+        versionCode 1
+        versionName "1.0"
+        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
+        aaptOptions {
+             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
+             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
+            ignoreAssetsPattern = '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
+        }
+    }
+    buildTypes {
+        release {
+            minifyEnabled false
+            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
+        }
+    }
+}
+
+repositories {
+    flatDir{
+        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
+    }
+}
+
+dependencies {
+    implementation fileTree(include: ['*.jar'], dir: 'libs')
+    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
+    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
+    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
+    implementation project(':capacitor-android')
+    testImplementation "junit:junit:$junitVersion"
+    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
+    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
+    implementation project(':capacitor-cordova-android-plugins')
+}
+
+apply from: 'capacitor.build.gradle'
+
+try {
+    def servicesJSON = file('google-services.json')
+    if (servicesJSON.text) {
+        apply plugin: 'com.google.gms.google-services'
+    }
+} catch(Exception e) {
+    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
+}
diff --git a/android/app/capacitor.build.gradle b/android/app/capacitor.build.gradle
new file mode 100644
index 0000000..a875002
--- /dev/null
+++ b/android/app/capacitor.build.gradle
@@ -0,0 +1,21 @@
+// DO NOT EDIT THIS FILE! IT IS GENERATED EACH TIME "capacitor update" IS RUN
+
+android {
+  compileOptions {
+      sourceCompatibility JavaVersion.VERSION_21
+      targetCompatibility JavaVersion.VERSION_21
+  }
+}
+
+apply from: "../capacitor-cordova-android-plugins/cordova.variables.gradle"
+dependencies {
+    implementation project(':capacitor-community-bluetooth-le')
+    implementation project(':capacitor-camera')
+    implementation project(':capacitor-voice-recorder')
+
+}
+
+
+if (hasProperty('postBuildExtras')) {
+  postBuildExtras()
+}
diff --git a/android/app/proguard-rules.pro b/android/app/proguard-rules.pro
new file mode 100644
index 0000000..f1b4245
--- /dev/null
+++ b/android/app/proguard-rules.pro
@@ -0,0 +1,21 @@
+# Add project specific ProGuard rules here.
+# You can control the set of applied configuration files using the
+# proguardFiles setting in build.gradle.
+#
+# For more details, see
+#   http://developer.android.com/guide/developing/tools/proguard.html
+
+# If your project uses WebView with JS, uncomment the following
+# and specify the fully qualified class name to the JavaScript interface
+# class:
+#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
+#   public *;
+#}
+
+# Uncomment this to preserve the line number information for
+# debugging stack traces.
+#-keepattributes SourceFile,LineNumberTable
+
+# If you keep the line number information, uncomment this to
+# hide the original source file name.
+#-renamesourcefileattribute SourceFile
diff --git a/android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java b/android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java
new file mode 100644
index 0000000..f2c2217
--- /dev/null
+++ b/android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java
@@ -0,0 +1,26 @@
+package com.getcapacitor.myapp;
+
+import static org.junit.Assert.*;
+
+import android.content.Context;
+import androidx.test.ext.junit.runners.AndroidJUnit4;
+import androidx.test.platform.app.InstrumentationRegistry;
+import org.junit.Test;
+import org.junit.runner.RunWith;
+
+/**
+ * Instrumented test, which will execute on an Android device.
+ *
+ * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
+ */
+@RunWith(AndroidJUnit4.class)
+public class ExampleInstrumentedTest {
+
+    @Test
+    public void useAppContext() throws Exception {
+        // Context of the app under test.
+        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
+
+        assertEquals("com.getcapacitor.app", appContext.getPackageName());
+    }
+}
diff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml
new file mode 100644
index 0000000..d62930a
--- /dev/null
+++ b/android/app/src/main/AndroidManifest.xml
@@ -0,0 +1,42 @@
+<?xml version="1.0" encoding="utf-8"?>
+<manifest xmlns:android="http://schemas.android.com/apk/res/android">
+
+    <application
+        android:allowBackup="true"
+        android:icon="@mipmap/ic_launcher"
+        android:label="@string/app_name"
+        android:roundIcon="@mipmap/ic_launcher_round"
+        android:supportsRtl="true"
+        android:theme="@style/AppTheme">
+
+        <activity
+            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
+            android:name=".MainActivity"
+            android:label="@string/title_activity_main"
+            android:theme="@style/AppTheme.NoActionBarLaunch"
+            android:launchMode="singleTask"
+            android:exported="true">
+
+            <intent-filter>
+                <action android:name="android.intent.action.MAIN" />
+                <category android:name="android.intent.category.LAUNCHER" />
+            </intent-filter>
+
+        </activity>
+
+        <provider
+            android:name="androidx.core.content.FileProvider"
+            android:authorities="${applicationId}.fileprovider"
+            android:exported="false"
+            android:grantUriPermissions="true">
+            <meta-data
+                android:name="android.support.FILE_PROVIDER_PATHS"
+                android:resource="@xml/file_paths"></meta-data>
+        </provider>
+    </application>
+
+    <!-- Permissions -->
+
+    <uses-permission android:name="android.permission.INTERNET" />
+    <uses-permission android:name="android.permission.RECORD_AUDIO" />
+</manifest>
diff --git a/android/app/src/main/java/com/motorcycleverify/app/MainActivity.java b/android/app/src/main/java/com/motorcycleverify/app/MainActivity.java
new file mode 100644
index 0000000..1e6a447
--- /dev/null
+++ b/android/app/src/main/java/com/motorcycleverify/app/MainActivity.java
@@ -0,0 +1,5 @@
+package com.motorcycleverify.app;
+
+import com.getcapacitor.BridgeActivity;
+
+public class MainActivity extends BridgeActivity {}
diff --git a/android/app/src/main/res/drawable-land-hdpi/splash.png b/android/app/src/main/res/drawable-land-hdpi/splash.png
new file mode 100644
index 0000000..e31573b
Binary files /dev/null and b/android/app/src/ma
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 577862f

---

## 2026年8月28日 週五

### 訊息功能：本機設置與本地開發

- 使用者：Archi
- 時間：2026-08-28
- 分類：系統
- 類型：開發

#### Prompt
要怎麼在自己的電腦上跑啊

#### 摘要
從現有 motoverify-prototype.html 提取訊息功能，建立獨立專案；協助使用者排除本機開發環境問題（工作目錄錯誤、.env 檔案隱藏、TextEdit 自動加副檔名）。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
1. 安裝 Node.js LTS 版
2. 解壓縮 motoverify-messages.zip
3. 開啟終端機（Mac: Command+Space → Terminal）
4. 驗證 Node 安裝：node -v
5. 進入專案目錄：cd <path-to-motoverify-messages>
6. 安裝套件：npm install
7. 啟動開發伺服器：npm run dev
```

</details>

#### 結果
✅ 使用者成功在本地執行專案

#### 時數
2.5

---

### 需求討論

- 使用者：li220fish
- 時間：2026-08-28
- 分類：前台
- 類型：討論

#### 摘要
APP 流程與其他功能

#### 結果
驗證完成，功能確定上線（結案：2026-08-28）

#### 時數
1

---

### 建立機車模型流程

- 使用者：jefferylu33
- 時間：2026-08-28
- 分類：檢定辨識
- 類型：開發

#### 摘要
建置並測試 mmbcu 是否可以透過照片建立模型

#### 結果
實作受阻，暫停進行

#### 時數
5

---

### 新增實際流程版本 `20f378e`

- 使用者：li220fish
- 時間：2026-08-28 17:50
- 分類：檢定辨識
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/docs/verification-coverage.md b/docs/verification-coverage.md
new file mode 100644
index 0000000..6731693
--- /dev/null
+++ b/docs/verification-coverage.md
@@ -0,0 +1,200 @@
+# Verification Coverage Audit
+
+Compares every item in `完整看車流程.html` (170 items, A–R) against the V0.2 Seller/Buyer config (`src/data/verification/`). Method: read both source files in full, matched by content (not just numbering), one row per original item.
+
+**Result: 170/170 original items accounted for. No unexplained gaps.** 4 genuine gaps were found and fixed by adding new items (A-14 → B13-10, B-01 → B2-18, B-03 → B2-19, B-06 → B2-20, M-01..M-05 → S10-P1..P5) — see "Fixed gaps" below.
+
+| Original | Section                | → Seller                  | → Buyer                           | Status                                                                                                                                         |
+| -------- | ---------------------- | ------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
+| A-01     | A 出發前檢查           | —                         | B1-01                             | Buyer Only                                                                                                                                     |
+| A-02     | A 出發前檢查           | —                         | B1-02                             | Buyer Only                                                                                                                                     |
+| A-03     | A 出發前檢查           | —                         | B1-03                             | Buyer Only                                                                                                                                     |
+| A-04     | A 出發前檢查           | —                         | B1-04                             | Buyer Only                                                                                                                                     |
+| A-05     | A 出發前檢查           | —                         | B1-05                             | Buyer Only                                                                                                                                     |
+| A-06     | A 出發前檢查           | —                         | B1-06                             | Buyer Only                                                                                                                                     |
+| A-07     | A 出發前檢查           | —                         | B1-07                             | Buyer Only                                                                                                                                     |
+| A-08     | A 出發前檢查           | —                         | B1-08                             | Buyer Only                                                                                                                                     |
+| A-09     | A 出發前檢查           | —                         | B1-09                             | Buyer Only                                                                                                                                     |
+| A-10     | A 出發前檢查           | —                         | B1-10                             | Buyer Only                                                                                                                                     |
+| A-11     | A 出發前檢查           | —                         | B1-11                             | Buyer Only                                                                                                                                     |
+| A-12     | A 出發前檢查           | —                         | B1-12                             | Buyer Only                                                                                                                                     |
+| A-13     | A 出發前檢查           | —                         | B1-13                             | Buyer Only                                                                                                                                     |
+| A-14     | A 出發前檢查           | —                         | B13-10                            | Covered (moved to 過戶 section — cash is spent at transfer, not departure)                                                                     |
+| A-15     | A 出發前檢查           | —                         | —                                 | Not Applicable (meta commentary about the original guide itself, not an inspection item)                                                       |
+| B-01     | B 接觸車輛前           | —                         | B2-18                             | Covered                                                                                                                                        |
+| B-02     | B 接觸車輛前           | —                         | B2-01                             | Covered                                                                                                                                        |
+| B-03     | B 接觸車輛前           | —                         | B2-19                             | Covered                                                                                                                                        |
+| B-04     | B 接觸車輛前           | —                         | B2-02 (folded in)                 | Covered (merged into vehicle-data cross-check)                                                                                                 |
+| B-05     | B 接觸車輛前           | —                         | —                                 | Not Applicable (tactic covered implicitly — B2 chat naturally precedes B3 cold-check in flow order)                                            |
+| B-06     | B 接觸車輛前           | —                         | B2-20                             | Covered                                                                                                                                        |
+| B-07     | B 接觸車輛前           | —                         | B2-04                             | Covered                                                                                                                                        |
+| B-08     | B 接觸車輛前           | —                         | B2-05                             | Covered                                                                                                                                        |
+| B-09     | B 接觸車輛前           | —                         | B2-06                             | Covered                                                                                                                                        |
+| B-10     | B 接觸車輛前           | —                         | B2-07                             | Covered                                                                                                                                        |
+| B-11     | B 接觸車輛前           | —                         | B2-08                             | Covered                                                                                                                                        |
+| B-12     | B 接觸車輛前           | —                         | B2-09                             | Covered                                                                                                                                        |
+| B-13     | B 接觸車輛前           | —                         | B2-10                             | Covered                                                                                                                                        |
+| B-14     | B 接觸車輛前           | —                         | B2-11                             | Covered                                                                                                                                        |
+| B-15     | B 接觸車輛前           | —                         | B2-12                             | Covered                                                                                                                                        |
+| B-16     | B 接觸車輛前           | —                         | B2-13                             | Covered                                                                                                                                        |
+| B-17     | B 接觸車輛前           | —                         | B2-14                             | Covered                                                                                                                                        |
+| B-18     | B 接觸車輛前           | —                         | B2-15                             | Covered                                                                                                                                        |
+| B-19     | B 接觸車輛前           | —                         | B2-16                             | Covered                                                                                                                                        |
+| B-20     | B 接觸車輛前           | —                         | B2-17                             | Covered                                                                                                                                        |
+| B-21     | B 接觸車輛前           | S5 (cold-check SOP)       | B3 (cold-check SOP)               | Covered (IR probe replaced by hand + App SOP — deliberate hardware-strategy change, §12)                                                       |
+| C-01     | C 外觀檢視 I           | S2-01                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-02     | C 外觀檢視 I           | S2-02                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-03     | C 外觀檢視 I           | S2-03                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-04     | C 外觀檢視 I           | S2-04                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-05     | C 外觀檢視 I           | S2-05                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-06     | C 外觀檢視 I           | S2-06                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-07     | C 外觀檢視 I           | S2-07                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-08     | C 外觀檢視 I           | S2-08                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-09     | C 外觀檢視 I           | S2-09                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-10     | C 外觀檢視 I           | S2-10                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-11     | C 外觀檢視 I           | S2-11                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-12     | C 外觀檢視 I           | S2-12                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-13     | C 外觀檢視 I           | S2-13                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-14     | C 外觀檢視 I           | S2-14                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| C-15     | C 外觀檢視 I           | S2-15                     | —                                 | Seller Only (S2), condensed re-check in Buyer B4                                                                                               |
+| D-01     | D 引擎外觀檢查         | S3-01                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-02     | D 引擎外觀檢查         | S3-02                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-03     | D 引擎外觀檢查         | S3-03                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-04     | D 引擎外觀檢查         | S3-04                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-05     | D 引擎外觀檢查         | S3-05                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-06     | D 引擎外觀檢查         | S3-06                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-07     | D 引擎外觀檢查         | S3-07                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-08     | D 引擎外觀檢查         | S3-08                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-09     | D 引擎外觀檢查         | S3-09                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-10     | D 引擎外觀檢查         | S3-10                     | —                                 | Seller Only (S3), condensed re-check in Buyer B5                                                                                               |
+| D-11     | D 引擎外觀檢查         | —                         | —                                 | Not Applicable (IR baseline temp superseded by cold-check SOP, §21)                                                                            |
+| E-01     | E 電系外觀檢查         | S4-01                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-02     | E 電系外觀檢查         | S4-02                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-03     | E 電系外觀檢查         | S4-03                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-04     | E 電系外觀檢查         | S4-04                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-05     | E 電系外觀檢查         | S4-05                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-06     | E 電系外觀檢查         | S4-06                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-07     | E 電系外觀檢查         | S4-07                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-08     | E 電系外觀檢查         | S4-08                     | —                                 | Seller Only (S4)                                                                                                                               |
+| E-09     | E 電系外觀檢查         | S4-09                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-01     | F 改裝外觀檢查         | S4-10                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-02     | F 改裝外觀檢查         | S4-11                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-03     | F 改裝外觀檢查         | S4-12                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-04     | F 改裝外觀檢查         | S4-13                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-05     | F 改裝外觀檢查         | S4-14                     | —                                 | Seller Only (S4)                                                                                                                               |
+| F-06     | F 改裝外觀檢查         | S4-15                     | —                                 | Seller Only (S4)                                                                                                                               |
+| G-01     | G 消耗品檢查           | S4-16                     | —                                 | Seller Only (S4), c
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 20f378e

---

## 2026年8月29日 週六

### 訊息功能：環境變數與 Vercel 部署

- 使用者：Archi
- 時間：2026-08-29
- 分類：系統
- 類型：開發

#### Prompt
設定 Supabase 連線並部署到 Vercel

#### 摘要
建立四表 Supabase 架構（profiles / conversations / participants / messages）與 SECURITY DEFINER RLS 策略，實作無環境變數時的 Demo in-memory 自動降級後端，並排除 Vercel 環境變數類型、GitHub Token scope、macOS keychain 快取等部署卡點。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
-- 四表結構
tables/
  profiles (uid, handle, avatar, createdAt)
  conversations (id, createdAt, subject)
  conversation_participants (conversationId, uid, joinedAt)
  messages (id, conversationId, senderUid, text, createdAt)

views/
  conversation_overview (conversationId, unreadCount, lastMessage)

-- RLS（SECURITY DEFINER 避免遞迴）
CREATE OR REPLACE FUNCTION get_conversation_access(
  conv_id UUID,
  user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE "conversationId" = conv_id AND "uid" = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

alter table messages enable row level security;
create policy "user_can_read_own_messages" on messages
  for select
  using (get_conversation_access(conversation_id, auth.uid()));

// Demo 後端自動降級（無環境變數時）
// src/services/backend.ts
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.log('[DEMO MODE] Using in-memory backend');
  // 四組假對話 + 自動回覆邏輯（1.4s 延遲）
  export const demoBackend = { /* ... */ };
}
```

</details>

#### 結果
✅ 成功部署至 https://motoverify-messages.vercel.app
遇到的問題：Vercel 環境變數誤設為 Secret 導致無法注入前端 build／GitHub Token 缺 repo scope／macOS keychain 快取舊認證

#### 時數
2.5

---

### 需求討論（商業項目）

- 使用者：Archi
- 時間：2026-08-29
- 分類：系統
- 類型：討論

#### 摘要
冠桑提供之意見

#### 結果
驗證完成，功能確定上線

#### 時數
2

---

## 2026年8月30日 週日

### 業務提案 v0.3：資料過渡機制與法律定位收斂

- 使用者：Archi
- 時間：2026-08-30 ～ 2026-09-02
- 分類：系統
- 類型：設計

#### Prompt
轉向內部迭代，聚焦於「資料過渡機制」與「法律定位」的設計決策

#### 摘要
透過深度討論，確認 QR code 現場掃碼方案完全解決「成交驗證」與「遠端詐騙」風險，進而重新設計整個提案架構。核心轉折：資料過渡機制改為 QR 現場掃碼、檢驗評分改為只顯示分項信號不顯示總分。

#### 結果
✅ 商業模式徹底收斂（B2B repair shop SaaS 為主力收入 60-70%）
✅ 法律定位清晰（檢驗分項信號，非總分裁決）
✅ 成交驗證機制設計完成（QR 現場掃碼 + 雙邊確認價格）
✅ 成交價資料庫成為獨佔優勢（台灣機車版實價登錄）
⚠️ MotoProbe 硬體完全缺席提案（技術上已實裝，但成本與供應鏈策略待決）
⚠️ Year 2 淨利邊際脆弱（NT$150K，評審必攻）
交付物：MotoVerify-Proposal-v0.3.docx + 海外市場分析

#### 時數
9

---

### 訊息功能：內部測試與設計迭代發現

- 使用者：Archi
- 時間：2026-08-30
- 分類：前台
- 類型：測試

#### Prompt
推送給團隊內部測試

#### 摘要
推送給團隊內部測試後發現使用者入口設計不符 real-world 流程：初版 all-users picker 不現實，應改為從市場刊登卡片發起聯繫或以使用者代碼／信箱查詢。

#### 結果
⚠️ 識別出第二版迭代項目
設計決策：移除 all-users picker／新增 Market tab（可直接聯繫賣家）／保留使用者代碼或信箱查詢（類 LINE ID 模式）

#### 時數
1.5

---

### R 語言應用場景評估

- 使用者：Archi
- 時間：2026-08-30
- 分類：系統
- 類型：研究

#### Prompt
（規劃階段的範例 prompt，尚未實際執行）
1. 用 R 讀入交通部 Excel，清理縣市機車掛牌數，產出按年份的保有量折線圖，計算重機佔比
2. 建立 Monte Carlo 敏感度分析，針對 v0.3 財務表的主要參數 simulate 一萬次，輸出 Year 2 淨利的 95% 信賴區間
3. 用 tidyverse 彙整過去一年的成交資料，用 quantreg 建立行情預測模型，輸出三分位數預測

#### 摘要
評估 R 語言在 MotoVerify 商業分析中的應用場景，確認 R（tidyverse + readxl + ggplot）最適合產品端資料工作。識別三個應用場景：市場規模查證（現在可做）、財務敏感度分析／Monte Carlo（現在可做）、行情預測與生存分析（有資料後）。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
# 市場規模查證
library(tidyverse); library(readxl)
data <- read_excel("交通部統計.xlsx", sheet = "機車掛牌數") %>%
  pivot_longer(cols = -年份, names_to = "縣市", values_to = "數量") %>%
  mutate(重機比例 = 數量 * 0.12)

# 財務敏感度分析（Monte Carlo）
params <- tibble(
  metric = c("shopCount", "conversionRate", "arpu", "churn"),
  mean = c(500, 0.15, 3000, 0.08),
  sd = c(100, 0.05, 500, 0.03)
)
simulations <- expand_grid(run = 1:10000, params %>% slice(1:3)) %>%
  mutate(shops = rnorm(n(), mean, sd), revenue = shops * conversionRate * arpu * 12)

# 行情預測（Quantile Regression）
library(quantreg)
model <- rq(price ~ make + age + mileage + mods, tau = c(0.25, 0.5, 0.75))
```

</details>

#### 結果
✅ R 在產品端資料工作已確認有效應用
✅ 優先順序清晰（市場規模 → 財務敏感度 → 統計模型）
⏳ 實踐待定（需交通部資料、提案假設文檔、Year 2+ 資料累積）

#### 時數
1.5

---

### 頁面更新版，驗車流更新版 `61c09b5`

- 使用者：li220fish
- 時間：2026-08-30 11:51
- 分類：前台
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/firebase.json b/firebase.json
index 3facb51..9436691 100644
--- a/firebase.json
+++ b/firebase.json
@@ -5,5 +5,15 @@
   },
   "storage": {
     "rules": "storage.rules"
+  },
+  "hosting": {
+    "public": "dist",
+    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
+    "rewrites": [
+      {
+        "source": "**",
+        "destination": "/index.html"
+      }
+    ]
   }
 }
diff --git a/src/assets/home/buyer-hero.svg b/src/assets/home/buyer-hero.svg
new file mode 100644
index 0000000..ad37537
--- /dev/null
+++ b/src/assets/home/buyer-hero.svg
@@ -0,0 +1,22 @@
+<!-- PLACEHOLDER — buyer-mode Home hero art. Reuses the shared line-art
+     silhouette (see motorcycle-silhouette.svg); swap for a licensed
+     motorcycle photograph before shipping. Kept as its own file per the
+     buyer/seller/professional asset interface so each can be swapped
+     independently later without touching component code. -->
+<svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
+  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
+    <circle cx="180" cy="300" r="86" />
+    <circle cx="180" cy="300" r="40" />
+    <circle cx="580" cy="300" r="86" />
+    <circle cx="580" cy="300" r="40" />
+    <path d="M180 300 L330 210 L420 210 L500 300" />
+    <path d="M330 210 L300 150 L245 150" />
+    <path d="M420 210 L455 130 L520 120" />
+    <path d="M420 210 L470 250 L580 300" />
+    <path d="M300 150 L360 150" />
+    <path d="M245 150 L215 120" />
+    <path d="M470 250 L560 245 L610 210" />
+    <ellipse cx="470" cy="242" rx="70" ry="16" />
+    <circle cx="520" cy="122" r="10" fill="#ffffff" stroke="none" opacity="0.85" />
+  </g>
+</svg>
diff --git a/src/assets/home/motorcycle-silhouette.svg b/src/assets/home/motorcycle-silhouette.svg
new file mode 100644
index 0000000..3baccf8
--- /dev/null
+++ b/src/assets/home/motorcycle-silhouette.svg
@@ -0,0 +1,19 @@
+<!-- PLACEHOLDER ART — simplified line-art silhouette standing in for real hero
+     photography. Swap for a licensed motorcycle photo before shipping. -->
+<svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
+  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
+    <circle cx="180" cy="300" r="86" />
+    <circle cx="180" cy="300" r="40" />
+    <circle cx="580" cy="300" r="86" />
+    <circle cx="580" cy="300" r="40" />
+    <path d="M180 300 L330 210 L420 210 L500 300" />
+    <path d="M330 210 L300 150 L245 150" />
+    <path d="M420 210 L455 130 L520 120" />
+    <path d="M420 210 L470 250 L580 300" />
+    <path d="M300 150 L360 150" />
+    <path d="M245 150 L215 120" />
+    <path d="M470 250 L560 245 L610 210" />
+    <ellipse cx="470" cy="242" rx="70" ry="16" />
+    <circle cx="520" cy="122" r="10" fill="#ffffff" stroke="none" opacity="0.85" />
+  </g>
+</svg>
diff --git a/src/assets/home/professional-hero.svg b/src/assets/home/professional-hero.svg
new file mode 100644
index 0000000..fd18d48
--- /dev/null
+++ b/src/assets/home/professional-hero.svg
@@ -0,0 +1,22 @@
+<!-- PLACEHOLDER — professional-seller-mode Home hero art. Reuses the shared
+     line-art silhouette (see motorcycle-silhouette.svg); swap for a
+     licensed motorcycle photograph before shipping. Kept as its own file
+     per the buyer/seller/professional asset interface so each can be
+     swapped independently later without touching component code. -->
+<svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
+  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
+    <circle cx="180" cy="300" r="86" />
+    <circle cx="180" cy="300" r="40" />
+    <circle cx="580" cy="300" r="86" />
+    <circle cx="580" cy="300" r="40" />
+    <path d="M180 300 L330 210 L420 210 L500 300" />
+    <path d="M330 210 L300 150 L245 150" />
+    <path d="M420 210 L455 130 L520 120" />
+    <path d="M420 210 L470 250 L580 300" />
+    <path d="M300 150 L360 150" />
+    <path d="M245 150 L215 120" />
+    <path d="M470 250 L560 245 L610 210" />
+    <ellipse cx="470" cy="242" rx="70" ry="16" />
+    <circle cx="520" cy="122" r="10" fill="#ffffff" stroke="none" opacity="0.85" />
+  </g>
+</svg>
diff --git a/src/assets/home/seller-hero.svg b/src/assets/home/seller-hero.svg
new file mode 100644
index 0000000..9f037e7
--- /dev/null
+++ b/src/assets/home/seller-hero.svg
@@ -0,0 +1,22 @@
+<!-- PLACEHOLDER — seller-mode Home hero art. Reuses the shared line-art
+     silhouette (see motorcycle-silhouette.svg); swap for a licensed
+     motorcycle photograph before shipping. Kept as its own file per the
+     buyer/seller/professional asset interface so each can be swapped
+     independently later without touching component code. -->
+<svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg">
+  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
+    <circle cx="180" cy="300" r="86" />
+    <circle cx="180" cy="300" r="40" />
+    <circle cx="580" cy="300" r="86" />
+    <circle cx="580" cy="300" r="40" />
+    <path d="M180 300 L330 210 L420 210 L500 300" />
+    <path d="M330 210 L300 150 L245 150" />
+    <path d="M420 210 L455 130 L520 120" />
+    <path d="M420 210 L470 250 L580 300" />
+    <path d="M300 150 L360 150" />
+    <path d="M245 150 L215 120" />
+    <path d="M470 250 L560 245 L610 210" />
+    <ellipse cx="470" cy="242" rx="70" ry="16" />
+    <circle cx="520" cy="122" r="10" fill="#ffffff" stroke="none" opacity="0.85" />
+  </g>
+</svg>
diff --git a/src/components/common/AppHeader.vue b/src/components/common/AppHeader.vue
index a4c5b67..5600e52 100644
--- a/src/components/common/AppHeader.vue
+++ b/src/components/common/AppHeader.vue
@@ -2,12 +2,19 @@
 import { ChevronLeft } from 'lucide-vue-next'
 import { useRouter } from 'vue-router'
 
-withDefaults(
+const props = withDefaults(
   defineProps<{
     title?: string
     back?: boolean
+    /** When true, the parent's @back handler owns navigation entirely and
+     *  router.back() is never called as a fallback. Needed because Vue
+     *  strips a recognized emit's `onBack` listener out of $attrs, so it
+     *  can't be detected implicitly — this has to be explicit. Used by the
+     *  verification flow, which always wants a deterministic exit (its own
+     *  Vehicle Detail page), never raw browser history. */
+    customBack?: boolean
   }>(),
-  { title: '', back: false },
+  { title: '', back: false, customBack: false },
 )
 
 const emit = defineEmits<{ back: [] }>()
@@ -15,7 +22,7 @@ const router = useRouter()
 
 function handleBack(): void {
   emit('back')
-  router.back()
+  if (!props.customBack) router.back()
 }
 </script>
 
diff --git a/src/components/common/BottomNavigation.vue b/src/components/common/BottomNavigation.vue
index 7b33353..232dc60 100644
--- a/src/components/common/BottomNavigation.vue
+++ b/src/components/common/BottomNavigation.vue
@@ -1,14 +1,14 @@
 <script setup lang="ts">
-import { Bike, Bluetooth, Home, ShieldCheck, User } from 'lucide-vue-next'
+import { FileText, Home, ShieldCheck, ShoppingBag, User } from 'lucide-vue-next'
 import { RouterLink, useRoute } from 'vue-router'
 
 const route = useRoute()
 
 const items = [
   { path: '/dashboard', label: '首頁', icon: Home },
-  { path: '/vehicles', label: '車輛', icon: Bike },
-  { path: '/verification', label: '驗證', icon: ShieldCheck },
-  { path: '/probe', label: 'Probe', icon: Bluetooth },
+  { path: '/marketplace', label: '市場', icon: ShoppingBag },
+  { path: '/verification', label: '驗證', icon: ShieldCheck, raised: true },
+  { path: '/reports', label: '報告', icon: FileText },
   { path: '/settings', label: '我的', icon: User },
 ]
 
@@ -24,9 +24,11 @@ function isActive(path: string): boolean {
       :key="item.path"
       :to="item.path"
       class="nav-item"
-      :class="{ active: isActive(item.path) }"
+      :class="{ active: isActive(item.path), raised: item.raised }"
     >
-      <component :is="item.icon" :size="22" />
+      <span class="icon-wrap">
+        <component :is="item.icon" :size="item.raised ? 22 : 22" />
+      </span>
       <span>{{ item.label }}</span>
     </RouterLink>
   </nav>
@@ -40,6 +42,7 @@ function isActive(path: string): boolean {
   right: 0;
   display: flex;
   justify-content: space-around;
+  align-items: flex-end;
   background: var(--color-surface);
   border-top: 1px solid var(--color-border);
   padding-top: 6px;
@@ -61,4 +64,21 @@ function isActive(path: string): boolean {
 .nav-item.active {
   color: var(--color-primary);
 }
+
+.nav-item.raised .icon-wrap {
+  width: 44px;
+  height: 44px;
+  border-radius: 999px;
+  background: var(--color-primary);
+  color: #fff;
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  margin-top: -18px;
+  box-shadow: 0 4px 12px rgba(23, 105, 232, 0.35);
+}
+
+.nav-item.raised span:last-child {
+  margin-top: 2px;
+}
 </style>
diff --git a/src/components/home/BuyerHomeContent.vue b/src/components/home/BuyerHomeContent.vue
new file mode 100644
index 0000000..34276de
--- /dev/null
+++ b/src/components/home/BuyerHomeContent.vue
@@ -0,0 +1,93 @@
+<script setup lang="ts">
+import { Camera, Search, ShieldCheck, ShoppingBag } from 'lucide-vue-next'
+import { useRouter } from 'vue-router'
+
+import HomeHero from './HomeHero.vue'
+import QuickActionGrid from './QuickActionGrid.vue'
+import type { QuickAction } from './QuickActionGrid.vue'
+import VehicleCarousel from './VehicleCarousel.vue'
+import VehicleSearchBar from './VehicleSearchBar.vue'
+import { MOCK_MARKET_LISTINGS } from '@/data/home/marketplace-mock'
+
+const router = useRouter()
+
+function scrollToSearch(): void {
+  document.getElementById('home-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
+}
+
+const actions: QuickAction[] = [
+  { icon: Search, label: '車輛查詢', to: null, onClick: scrollToSearch },
+  { icon: ShoppingBag, label: '交易市場', to: '/marketplace' },
+  { icon: ShieldCheck, label: '驗證報告', to: '/reports' },
+  // Buyer 現場複驗 — same verification mechanism as Seller's, just
+  // type=buyer instead of type=seller (see VerificationView's presetType).
+  { icon: Camera, label: '開始驗車', to: '/verification?type=buyer' },
+]
+</script>
+
+<template>
+  <div class="buyer-home">
+    <HomeHero
+      role="buyer"
+      brand="MotoVerify"
+      :title="['買得安心', '看得更清楚']"
+      description="查看驗證紀錄，再決定要不要去看車。"
+      primary-label="尋找車輛"
+      secondary-label="查看交易市場"
+      @primary="scrollToSearch"
+      @secondary="router.push('/marketplace')"
+    />
+
+    <div id="home-search" class="section">
+      <VehicleSearchBar />
+    </div>
+
+    <div class="section">
+      <QuickActionGrid :actions="actions" />
+    </div>
+
+    <div class="section">
+      <div class="section-header">
+        <h2>熱門車輛</h2>
+        <RouterLink to="/marketplace" class="see-all">查看全部 →</RouterLink>
+      </div>
+      <VehicleCarousel :listings="MOCK_MARKET_LISTINGS" />
+    </div>
+  </div>
+</template>
+
+<style scoped>
+.buyer-home {
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-lg);
+  padding-bottom: var(--space-lg);
+}
+
+.section {
+  padding: 0 var(--space-md);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-sm);
+}
+
+.section-header {
+  display: flex;
+  align-items: baseline;
+  justify-content: space-between;
+}
+
+.section-header h2 {
+  font-size: 18px;
+  font-weight: 800;
+  color: var(--color-text-primary);
+  margin: 0;
+}
+
+.see-all {
+  font-size: 12.5px;
+  font-weight: 700;
+  color: var(--color-primary);
+  text-decoration: none;
+}
+</style>
diff --git a/src/components/home/HomeHero.vue b/src/components/home/HomeHero.vue
new file mode 100644
index 0000000..e0d2204
--- /dev/null
+++ b/src/components/home/HomeHero.vue
@@ -0,0 +1,130 @@
+<script setup lang="ts">
+import { computed } from 'vue'
+
+import buyerHero from '@/assets/home/buyer-hero.svg'
+import professionalHero from '@/assets/home/professional-hero.svg'
+import sellerHero from '@/assets/home/seller-hero.svg'
+import type { UserUsageRole } from '@/types/user-preference'
+
+const props = defineProps<{
+  role: UserUsageRole
+  brand: string
+  title: string[]
+  description: string
+  primaryLabel: string
+  secondaryLabel: string
+}>()
+
+const emit = defineEmits<{ primary: []; secondary: [] }>()
+
+const heroImage = computed(
+  () =>
+    ({ buyer: buyerHero, seller: sellerHero, professional_seller: professionalHero })[props.role],
+)
+</script>
+
+<template>
+  <section class="hero">
+    <div class="hero-art" :style="{ backgroundImage: `url(&quot;${heroImage}&quot;)` }" />
+    <div class="overlay">
+      <p class="brand">{{ brand }}</p>
+      <h1 class="headline">
+        <span v-for="(line, i) in title" :key="i">{{ line }}</span>
+      </h1>
+      <p class="description">{{ description }}</p>
+      <div class="cta-row">
+        <button class="primary-cta" @click="emit('primary')">{{ primaryLabel }}</button>
+        <button class="secondary-cta" @click="emit('secondary')">{{ secondaryLabel }} →</button>
+      </div>
+    </div>
+  </section>
+</template>
+
+<style scoped>
+.hero {
+  position: relative;
+  min-height: 300px;
+  padding: var(--space-lg) var(--space-md) var(--space-xl);
+  display: flex;
+  align-items: flex-end;
+  overflow: hidden;
+  background: linear-gradient(165deg, var(--color-hero-from) 0%, var(--color-hero-to) 100%);
+}
+
+.hero-art {
+  position: absolute;
+  inset: 0;
+  background-size: 440px auto;
+  background-repeat: no-repeat;
+  background-position: right -50px bottom -30px;
+  opacity: 0.85;
+  -webkit-mask-image: linear-gradient(100deg, transparent 0%, transparent 20%, #000 55%);
+  mask-image: linear-gradient(100deg, transparent 0%, transparent 20%, #000 55%);
+}
+
+.overlay {
+  position: relative;
+  z-index: 1;
+  display: flex;
+  flex-direction: column;
+  gap: 10px;
+  max-width: 320px;
+}
+
+.brand {
+  font-size: 13px;
+  font-weight: 800;
+  letter-spacing: 0.06em;
+  color: #9db8f0;
+  margin: 0;
+}
+
+.headline {
+  margin: 0;
+  font-size: 30px;
+  font-weight: 800;
+  line-height: 1.25;
+  color: #ffffff;
+  display: flex;
+  flex-direction: column;
+}
+
+.description {
+  margin: 4px 0 6px;
+  font-size: 14px;
+  line-height: 1.6;
+  color: #dbe4f7;
+}
+
+.cta-row {
+  display: flex;
+  flex-direction: column;
+  align-items: flex-start;
+  gap: 10px;
+  margin-top: 6px;
+}
+
+.primary-cta {
+  height: 48px;
+  padding: 0 24px;
+  border-radius: var(--radius-md);
+  border: none;
+  background: var(--color-primary);
+  color: #fff;
+  font-size: 15px;
+  font-weight: 700;
+}
+
+.primary-cta:active {
+  transform: scale(0.98);
+}
+
+.secondary-cta {
+  background: none;
+  border: none;
+  color: #ffffff;
+  font-size: 13.5px;
+  font-weight: 700;
+  padding: 4px 0;
+}
+</style>
diff --git a/src/components/home/ProfessionalHomeContent.vue b/src/components/home/ProfessionalHomeContent.vue
new file mode 100644
index 0000000..1dd71ec
--- /dev/null
+++ b/src/components/home/ProfessionalHomeContent.vue
@@ -0,0 +1,118 @@
+<script setup lang="ts">
+import { onMounted, ref } from 'vue'
+import { Bike, FolderCheck, PlusCircle, Wallet } from 'lucide-vue-next'
+import { useRouter } from 'vue-router'
+
+import HomeHero from './HomeHero.vue'
+import ProfessionalStats from './ProfessionalStats.vue'
+import QuickActionGrid from './QuickActionGrid.vue'
+import type { QuickAction } from './QuickActionGrid.vue'
+import { verificationService } from '@/services/firebase/verification.service'
+import { useVehicleStore } from '@/stores/vehicle.store'
+
+const router = useRouter()
+const vehicleStore = useVehicleStore()
+
+const pendingCount = ref(0)
+const inProgressCount = ref(0)
+const completedCount = ref(0)
+// No transaction backend exists yet (§18/§41 of the Home redesign spec) —
+// shown honestly as 0 rather than faked, pending a real Transaction model.
+const pendingTransactionCount = ref(0)
+
+async function loadStats(): Promise<void> {
+  if (vehicleStore.vehicles.length === 0) await vehicleStore.fetchVehicles()
+  // Bounded to the 30 most recently updated vehicles to keep this an
+  // overview stat, not an unbounded full-inventory scan on every Home visit.
+  const targets = [...vehicleStore.vehicles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)
+
+  let pending = 0
+  let inProgress = 0
+  let completed = 0
+
+  await Promise.all(
+    targets.map(async (vehicle) => {
+      try {
+        const verifications = await verificationService.listByVehicle(vehicle.id)
+        const sellerVerifications = verifications.filter((v) => v.type === 'seller')
+        if (sellerVerifications.length === 0) {
+          pending += 1
+          return
+        }
+        if (sellerVerifications.some((v) => v.status === 'completed')) {
+          completed += 1
+        } else {
+          inProgress += 1
+        }
+      } catch {
+        // best-effort aggregate — skip vehicles whose verification list fails to load
+      }
+    }),
+  )
+
+  pendingCount.value = pending
+  inProgressCount.value = inProgress
+  completedCount.value = completed
+}
+
+onMounted(loadStats)
+
+const actions: QuickAction[] = [
+  { icon: Bike, label: '車輛管理', to: '/vehicles' },
+  { icon: PlusCircle, label: '新增驗證', to: '/verification?type=seller' },
+  { icon: FolderCheck, label: '報告管理', to: '/reports' },
+  { icon: Wallet, label: '交易管理', to: null },
+]
+</script>
+
+<template>
+  <div class="pro-home">
+    <HomeHero
+      role="professional_seller"
+      brand="MotoVerify Pro"
+      :title="['讓每一台車', '都有可信的車況資料']"
+      description="批量管理、驗證與交易紀錄。"
+      primary-label="新增待售車輛"
+      secondary-label="查看車輛管理"
+      @primary="router.push('/vehicles')"
+      @secondary="router.push('/vehicles')"
+    />
+
+    <div class="section">
+      <h2>今日概況</h2>
+      <ProfessionalStats
+        :pending-count="pendingCount"
+        :in-progress-count="inProgressCount"
+        :completed-count="completedCount"
+        :pending-transaction-count="pendingTransactionCount"
+      />
+    </div>
+
+    <div class="section">
+      <QuickActionGrid :actions="actions" />
+    </div>
+  </div>
+</template>
+
+<style scoped>
+.pro-home {
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-lg);
+  padding-bottom: var(--space-lg);
+}
+
+.section {
+  padding: 0 var(--space-md);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-sm);
+}
+
+.section h2 {
+  font-size: 18px;
+  font-weight: 800;
+  color: var(--color-text-primary);
+  margin: 0;
+}
+</style>
diff --git a/src/components/home/ProfessionalStats.vue b/src/components/home/ProfessionalStats.vue
new file mode 100644
index 0000000..46d0526
--- /dev/null
+++ b/src/components/home/ProfessionalStats.vue
@@ -0,0 +1,59 @@
+<script setup lang="ts">
+defineProps<{
+  pendingCount: number
+  inProgressCount: number
+  completedCount: number
+  pendingTransactionCount: number
+}>()
+</script>
+
+<template>
+  <div class="stat-grid">
+    <div class="stat-card">
+      <p class="value">{{ pendingCount }}</p>
+      <p class="label">待驗證</p>
+    </div>
+    <div class="stat-card">
+      <p class="value">{{ inProgressCount }}</p>
+      <p class="label">驗證中</p>
+    </div>
+    <div class="stat-card">
+      <p class="value">{{ completedCount }}</p>
+      <p class="label">已完成</p>
+    </div>
+    <div class="stat-card">
+      <p class="value">{{ pendingTransactionCount }}</p>
+      <p class="label">待處理交易</p>
+    </div>
+  </div>
+</template>
+
+<style scoped>
+.stat-grid {
+  display: grid;
+  grid-template-columns: 1fr 1fr;
+  gap: var(--space-sm);
+}
+
+.stat-card {
+  padding: var(--space-md);
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  box-shadow: var(--shadow-card);
+}
+
+.value {
+  font-size: 26px;
+  font-weight: 800;
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 61c09b5

---

### app 架構 demo

- 使用者：Archi
- 時間：2026-08-30
- 分類：前台
- 類型：開發

#### 摘要
冠桑 HTML 實作；demo v0.3 done

#### 結果
需求已完成，等待其他成員／外人驗證（結案：2026-08-30）

#### 時數
5

---

### app demo 檢討

- 使用者：Archi
- 時間：2026-08-30
- 分類：前台
- 類型：討論

#### 摘要
組員針對 demo v0.3 進行討論及增訂；備註：車輛介紹功能 should be in market page

#### 結果
驗證完成，功能確定上線（結案：2026-08-30）

#### 時數
2

---

### Create readme.md `dd4023f`

- 使用者：jefferylu33
- 時間：2026-08-30 14:41
- 分類：系統
- 類型：其他

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/volatgemeter/readme.md b/volatgemeter/readme.md
new file mode 100644
index 0000000..8b13789
--- /dev/null
+++ b/volatgemeter/readme.md
@@ -0,0 +1 @@
+
```

</details>

#### 結果
已提交 commit dd4023f

---

### Add files via upload `e0d5c24`

- 使用者：jefferylu33
- 時間：2026-08-30 14:45
- 分類：系統
- 類型：其他

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/volatgemeter/index.html b/volatgemeter/index.html
new file mode 100644
index 0000000..e773a72
--- /dev/null
+++ b/volatgemeter/index.html
@@ -0,0 +1,271 @@
+<!DOCTYPE html>
+<html lang="zh-TW">
+<head>
+  <meta charset="UTF-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1.0">
+  <title>機車電瓶 Web Bluetooth 示波器</title>
+  <style>
+    body {
+      background-color: #121212;
+      color: #e0e0e0;
+      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
+      margin: 0;
+      padding: 16px;
+      display: flex;
+      flex-direction: column;
+      align-items: center;
+    }
+    .panel {
+      width: 100%;
+      max-width: 800px;
+      background: #1e1e1e;
+      border-radius: 12px;
+      padding: 16px;
+      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
+      box-sizing: border-box;
+    }
+    .header {
+      display: flex;
+      justify-content: space-between;
+      align-items: center;
+      margin-bottom: 12px;
+      flex-wrap: wrap;
+      gap: 8px;
+    }
+    .status {
+      font-size: 14px;
+      padding: 4px 10px;
+      border-radius: 6px;
+      background: #333;
+    }
+    .status.connected { background: #005f33; color: #00ff88; }
+    .voltage-display {
+      font-size: 32px;
+      font-weight: bold;
+      color: #00ffcc;
+      margin: 8px 0;
+    }
+    canvas {
+      width: 100%;
+      height: 320px;
+      background: #000;
+      border-radius: 8px;
+      border: 1px solid #333;
+      display: block;
+    }
+    .controls {
+      margin-top: 16px;
+      display: flex;
+      gap: 10px;
+      flex-wrap: wrap;
+    }
+    button {
+      flex: 1;
+      padding: 12px;
+      font-size: 16px;
+      font-weight: bold;
+      border: none;
+      border-radius: 8px;
+      cursor: pointer;
+      background: #007bff;
+      color: #fff;
+    }
+    button:disabled { background: #444; color: #888; cursor: not-allowed; }
+    button.disconnect { background: #dc3545; }
+  </style>
+</head>
+<body>
+
+  <div class="panel">
+    <div class="header">
+      <h2>機車電瓶即時示波器</h2>
+      <div id="bleStatus" class="status">藍芽未連接</div>
+    </div>
+
+    <div class="voltage-display">
+      <span id="currentVoltage">--.--</span> <span style="font-size:18px; color:#aaa;">V</span>
+    </div>
+
+    <canvas id="scopeCanvas" width="800" height="320"></canvas>
+
+    <div class="controls">
+      <button id="btnConnect">連接 ESP32 藍芽</button>
+      <button id="btnDisconnect" class="disconnect" disabled>斷開連接</button>
+    </div>
+  </div>
+
+  <script>
+    // 與 ESP32 韌體對應的 UUID
+    const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
+    const CHAR_UUID    = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
+    const DIVIDER_RATIO = 6.0; // 分壓比 (100k + 20k) / 20k
+
+    let bleDevice = null;
+    let bleCharacteristic = null;
+
+    // 示波器波形緩衝區 (保存 500 點歷史數據)
+    const BUFFER_SIZE = 500;
+    const waveBuffer = new Float32Array(BUFFER_SIZE).fill(0);
+    let latestVoltage = 0.0;
+
+    const canvas = document.getElementById('scopeCanvas');
+    const ctx = canvas.getContext('2d');
+    const btnConnect = document.getElementById('btnConnect');
+    const btnDisconnect = document.getElementById('btnDisconnect');
+    const statusLabel = document.getElementById('bleStatus');
+    const voltDisplay = document.getElementById('currentVoltage');
+
+    // -------------------------------------------------------------
+    // 1. Web Bluetooth 連線邏輯
+    // -------------------------------------------------------------
+    btnConnect.addEventListener('click', async () => {
+      try {
+        statusLabel.textContent = "搜尋裝置中...";
+        // 請求藍芽裝置 (必須由手勢觸發)
+        bleDevice = await navigator.bluetooth.requestDevice({
+          filters: [{ name: 'ESP32_Oscilloscope' }],
+          optionalServices: [SERVICE_UUID]
+        });
+
+        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
+
+        statusLabel.textContent = "連線 GATT 伺服器...";
+        const server = await bleDevice.gatt.connect();
+        const service = await server.getPrimaryService(SERVICE_UUID);
+        bleCharacteristic = await service.getCharacteristic(CHAR_UUID);
+
+        // 啟動 Notification 接收原始封包
+        await bleCharacteristic.startNotifications();
+        bleCharacteristic.addEventListener('characteristicvaluechanged', handleDataPacket);
+
+        statusLabel.textContent = "藍芽已連線";
+        statusLabel.className = "status connected";
+        btnConnect.disabled = true;
+        btnDisconnect.disabled = false;
+
+      } catch (error) {
+        console.error("連線失敗:", error);
+        statusLabel.textContent = "連線失敗";
+        alert("連線失敗: " + error.message);
+      }
+    });
+
+    btnDisconnect.addEventListener('click', () => {
+      if (bleDevice && bleDevice.gatt.connected) {
+        bleDevice.gatt.disconnect();
+      }
+    });
+
+    function onDisconnected() {
+      statusLabel.textContent = "藍芽已斷線";
+      statusLabel.className = "status";
+      btnConnect.disabled = false;
+      btnDisconnect.disabled = true;
+    }
+
+    // -------------------------------------------------------------
+    // 2. 高效二進位封包解析 (Binary Payload Parser)
+    // -------------------------------------------------------------
+    function handleDataPacket(event) {
+      const dataView = event.target.value;
+      if (dataView.byteLength < 6) return;
+
+      // 檢查 Header 是否為 0x55AA
+      const header = dataView.getUint16(0, true);
+      if (header !== 0x55AA) return;
+
+      const sampleCount = dataView.getUint16(4, true);
+
+      // 一次解析封包內的採樣點
+      for (let i = 0; i < sampleCount; i++) {
+        const rawMv = dataView.getUint16(6 + (i * 2), true);
+        const volt = (rawMv / 1000.0) * DIVIDER_RATIO;
+
+        // 推入循環緩衝區
+        shiftAndPushBuffer(volt);
+        latestVoltage = volt;
+      }
+
+      // 同步檢查：如果有外網且發生發動異常 (如電壓急降 < 9.5V)，上傳雲端
+      if (latestVoltage > 0.5 && latestVoltage < 9.5) {
+        syncWarningToCloud({ event: "CRANKING_VOLTAGE_DROP", voltage: latestVoltage });
+      }
+    }
+
+    function shiftAndPushBuffer(val) {
+      waveBuffer.copyWithin(0, 1);
+      waveBuffer[BUFFER_SIZE - 1] = val;
+    }
+
+    // -------------------------------------------------------------
+    // 3. 高效 Canvas 示波器繪圖 (60 FPS RequestAnimationFrame)
+    // -------------------------------------------------------------
+    function renderScope() {
+      const w = canvas.width;
+      const h = canvas.height;
+
+      ctx.clearRect(0, 0, w, h);
+
+      // 繪製背景網格
+      ctx.strokeStyle = '#222';
+      ctx.lineWidth = 1;
+      for (let y = 0; y <= h; y += 40) {
+        ctx.beginPath();
+        ctx.moveTo(0, y);
+        ctx.lineTo(w, y);
+        ctx.stroke();
+      }
+
+      // 繪製 12V 標記線
+      const y12v = h - (12.0 / 18.0) * h;
+      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
+      ctx.setLineDash([4, 4]);
+      ctx.beginPath();
+      ctx.moveTo(0, y12v);
+      ctx.lineTo(w, y12v);
+      ctx.stroke();
+      ctx.setLineDash([]);
+
+      // 繪製電壓波形 (量程: 0V ~ 18V)
+      ctx.strokeStyle = '#00ffcc';
+      ctx.lineWidth = 2;
+      ctx.beginPath();
+
+      for (let i = 0; i < BUFFER_SIZE; i++) {
+        const x = (i / (BUFFER_SIZE - 1)) * w;
+        // 電壓換算成 Canvas Y 座標
+        const volt = waveBuffer[i];
+        const y = h - (volt / 18.0) * h;
+
+        if (i === 0) ctx.moveTo(x, y);
+        else ctx.lineTo(x, y);
+      }
+      ctx.stroke();
+
+      // 更新數字看板
+      voltDisplay.textContent = latestVoltage.toFixed(2);
+
+      requestAnimationFrame(renderScope);
+    }
+    requestAnimationFrame(renderScope);
+
+    // -------------------------------------------------------------
+    // 4. 外網同步範例 (走手機 4G/5G，不影響藍芽)
+    // -------------------------------------------------------------
+    let lastUploadTime = 0;
+    function syncWarningToCloud(payload) {
+      const now = Date.now();
+      if (now - lastUploadTime < 3000) return; // 節流：3秒內不重複觸發
+      lastUploadTime = now;
+
+      /* 替換為你的雲端 API 接口
+      fetch('https://api.yourdomain.com/v1/log-battery', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ ...payload, timestamp: now })
+      }).catch(err => console.error("雲端上傳失敗:", err));
+      */
+    }
+  </script>
+</body>
+</html>
\ No newline at end of file
diff --git a/volatgemeter/sketch_aug29a.ino b/volatgemeter/sketch_aug29a.ino
new file mode 100644
index 0000000..b6752b0
--- /dev/null
+++ b/volatgemeter/sketch_aug29a.ino
@@ -0,0 +1,113 @@
+#include <BLEDevice.h>
+#include <BLEServer.h>
+#include <BLE2902.h>
+
+#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
+#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
+
+#define SAMPLES_PER_PACKET 120
+#define ADC_PIN 34 
+const float DIVIDER_RATIO = (100000.0 + 20000.0) / 20000.0; // 6.0
+
+BLECharacteristic *pCharacteristic;
+bool deviceConnected = false;
+uint16_t packet_index = 0;
+
+// 定義二進位封包結構
+#pragma pack(push, 1)
+struct WaveformPacket {
+  uint16_t header = 0x55AA;
+  uint16_t index;
+  uint16_t count;
+  uint16_t samples[SAMPLES_PER_PACKET];
+} packet;
+#pragma pack(pop)
+
+// 藍芽回呼
+class ServerCallbacks: public BLEServerCallbacks {
+  void onConnect(BLEServer* pServer) { 
+    deviceConnected = true; 
+    Serial.println("\n>>> [BLE] 手機網頁已成功連線！開始高速串流傳輸 <<<");
+  }
+  void onDisconnect(BLEServer* pServer) { 
+    deviceConnected = false;
+    Serial.println("\n>>> [BLE] 手機已斷線，重新等待連線中... <<<");
+    pServer->getAdvertising()->start(); 
+  }
+};
+
+// 序列埠更新計時器變數
+unsigned long lastSerialPrint = 0;
+const unsigned long SERIAL_INTERVAL = 500; // 每 500ms 刷新一次序列埠資訊
+
+void setup() {
+  Serial.begin(115200);
+  
+  analogReadResolution(12);
+  analogSetPinAttenuation(ADC_PIN, ADC_11db);
+
+  BLEDevice::init("ESP32_Oscilloscope");
+  BLEDevice::setMTU(512);
+
+  BLEServer *pServer = BLEDevice::createServer();
+  pServer->setCallbacks(new ServerCallbacks());
+
+  BLEService *pService = pServer->createService(SERVICE_UUID);
+  pCharacteristic = pService->createCharacteristic(
+                      CHARACTERISTIC_UUID,
+                      BLECharacteristic::PROPERTY_NOTIFY
+                    );
+  pCharacteristic->addDescriptor(new BLE2902());
+  pService->start();
+
+  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
+  pAdvertising->addServiceUUID(SERVICE_UUID);
+  pAdvertising->setScanResponse(true);
+  pAdvertising->setMinPreferred(0x06);
+  pAdvertising->start();
+
+  Serial.println("==================================================");
+  Serial.println("  ESP32 機車電壓即時示波器 - 監控模式已啟動");
+  Serial.println("==================================================");
+}
+
+void loop() {
+  unsigned long sampleStartMicros = micros();
+
+  // 1. 高速連續採樣 120 點
+  for (int i = 0; i < SAMPLES_PER_PACKET; i++) {
+    packet.samples[i] = (uint16_t)analogReadMilliVolts(ADC_PIN);
+    delayMicroseconds(100); // 100µs 間隔
+  }
+
+  unsigned long sampleEndMicros = micros();
+  unsigned long samplingDuration = sampleEndMicros - sampleStartMicros; // 採樣 120 點耗時 (µs)
+
+  // 2. 若 BLE 已連線則發送 Notify 封包
+  if (deviceConnected) {
+    packet.index = packet_index++;
+    packet.count = SAMPLES_PER_PACKET;
+
+    pCharacteristic->setValue((uint8_t*)&packet, sizeof(packet));
+    pCharacteristic->notify();
+  }
+
+  // 3. 定時於序列埠視窗刷新數據 (不阻塞高速採樣)
+  unsigned long currentMillis = millis();
+  if (currentMillis - lastSerialPrint >= SERIAL_INTERVAL) {
+    lastSerialPrint = currentMillis;
+
+    // 取最後一個採樣點計算即時電壓
+    uint16_t lastRawMv = packet.samples[SAMPLES_PER_PACKET - 1];
+    float pinVoltage = lastRawMv / 1000.0;
+    float batteryVoltage = pinVoltage * DIVIDER_RATIO;
+
+    // 格式化輸出
+    Serial.printf("[%08lu ms] | 電瓶電壓: %5.2f V | ADC腳位: %4.2f V | 採樣120點耗時: %5lu µs | 藍芽狀態: %s\n",
+                  currentMillis,
+                  batteryVoltage,
+                  pinVoltage,
+                  samplingDuration,
+                  deviceConnected ? "已連線 (傳輸中)" : "等待連線");
+  }
+}
\ No newline at end of file
```

</details>

#### 結果
已提交 commit e0d5c24

---

## 2026年8月31日 週一

### 訊息功能：使用者入口與市場卡片遷移

- 使用者：Archi
- 時間：2026-08-31
- 分類：前台
- 類型：開發

#### Prompt
實裝新的使用者入口與市場卡片設計

#### 摘要
實裝新的使用者入口與市場卡片設計：新增 listings 資料表與 RLS 調整、Market tab 與 UserLookup 元件、Realtime 訂閱維持不變。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
-- migration-02-listings.sql
create table listings (
  id UUID PRIMARY KEY,
  seller_uid UUID REFERENCES profiles(uid),
  vehicle_id UUID REFERENCES vehicles(id),
  title TEXT NOT NULL,
  price INT,
  createdAt TIMESTAMP
);

alter policy "profiles_access" on profiles
  using (
    uid = auth.uid() OR
    uid IN (SELECT seller_uid FROM listings WHERE status = 'active')
  );

// Realtime 訂閱保留
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload)
  )
  .subscribe();
```

</details>

#### 結果
✅ 使用者入口符合 real-world 流程
✅ 市場卡片設計與訊息模組整合
✅ RLS 隱私隔離強化
⚠️ Market tab 卡片設計與主應用 Firebase 版本需協調

#### 時數
2.5

---

### 商業提案 v0.3

- 使用者：Archi
- 時間：2026-08-31
- 分類：系統
- 類型：開發

#### 摘要
冠桑整理討論內容重新定義十大定義，針對海內外市場研究調查

#### 結果
實作中，需求尚未完成（結案：2026-08-31）

#### 時數
1.5

---

### Motoverify_message 功能開發與實作

- 使用者：Archi
- 時間：2026-08-31
- 分類：前台
- 類型：開發

#### 摘要
冠桑進行 Motoverify_message 功能開發與實作並進行內測；透過 git 綁 Vercel 作為資料庫進行跨平台帳號傳訊息實作

#### 結果
需求已完成，等待其他成員／外人驗證（結案：2026-08-31）

#### 時數
5

---

## 2026年9月1日 週二

### Admin 後台設計與實裝（17 頁空殼）

- 使用者：Archi
- 時間：2026-09-01 ～ 2026-09-02
- 分類：後台
- 類型：設計

#### 摘要
設計與實裝一個潔淨空殼的 HTML 後台，涵蓋使用者管理、檢驗任務追蹤、市場監控、內容管理、裝置管理、合規檢查等十七個功能頁面。遵循「資料繫結就緒但無假資料」原則，以 data-collection / data-metric 屬性對應 Firestore。過程中識別三項技術衝突：檢驗評分總分 vs 分項信號、MotoProbe 硬體完全缺席商業提案、事件追蹤系統完全缺失。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
// Admin 登入與權限檢查
import { getAuth, onAuthStateChanged } from 'firebase/auth';

onAuthStateChanged(getAuth(), async user => {
  if (!user) {
    return location.href = '/login';
  }
  const { claims } = await user.getIdTokenResult();
  if (!claims.admin) {
    document.body.innerHTML = '<h1>無權限存取此頁面</h1>';
    return;
  }
  initializeDashboard();
});

<!-- 表格空狀態與資料繫結範例 -->
<table data-collection="users">
  <thead>
    <tr><th>名稱</th><th>信箱</th><th class="num">評分</th><th>狀態</th></tr>
  </thead>
  <tbody>
    <tr><td class="empty-cell" colspan="4">尚無資料</td></tr>
  </tbody>
</table>
```

</details>

#### 結果
✅ 後台架構清晰完整（17 頁功能全覆蓋）
✅ 資料繫結約定明確（data-collection / data-metric 屬性）
✅ 技術衝突已識別並記錄（檢驗評分呈現方式／MotoProbe硬體/事件追蹤缺失）
⚠️ 事件追蹤系統須先建設（Dashboard KPI 依賴）
⚠️ Cloud Function 聚合邏輯待實裝

#### 時數
7

---

### 頁面更新，討論後第三版 `b828246`

- 使用者：li220fish
- 時間：2026-09-01 00:35
- 分類：前台
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/.gitignore b/.gitignore
index 1a94a08..7453813 100644
--- a/.gitignore
+++ b/.gitignore
@@ -20,6 +20,10 @@ dist-ssr
 firebase-debug.log
 .firebase/
 
+# Playwright
+test-results/
+playwright-report/
+
 # Editor directories and files
 .vscode/*
 !.vscode/extensions.json
diff --git a/docs/test-accounts.md b/docs/test-accounts.md
new file mode 100644
index 0000000..bf084e4
--- /dev/null
+++ b/docs/test-accounts.md
@@ -0,0 +1,39 @@
+# Test Accounts — FOR DEVELOPMENT / QA ONLY
+
+These 3 accounts exist in the live `motorcycle-verification` Firebase project for local
+development, QA, and demo purposes. **Do not use them for real transactions.**
+
+| Role | Email | Password | Display Name | UID |
+|---|---|---|---|---|
+| Buyer | `buyer@motoverify.test` | `MotoVerify123!` | 測試買家 | `e399kAhI9PNTmC2RqRT3K6tdiRq1` |
+| Seller | `seller@motoverify.test` | `MotoVerify123!` | 測試賣家 | `C4Rn3b9vpoXn2mRoL8WJUnFOg9k1` |
+| Professional Seller (Dealer) | `dealer@motoverify.test` | `MotoVerify123!` | MotoVerify 車商 | `WfRtacVURlSxRIrrtBsVX7E651c2` |
+
+Each account has a `users/{uid}` profile document and a `userPreferences/{uid}` document
+with `currentRole` pre-set to its default role, so logging in lands directly on that
+role's Home screen without needing to pick a role first.
+
+## Regenerating
+
+```bash
+ALLOW_TEST_SEED=true npm run seed:test-users
+```
+
+The script ([scripts/seed-test-users.mjs](../scripts/seed-test-users.mjs)) is idempotent — re-running
+it signs into existing accounts instead of failing, and refreshes their `users/{uid}` /
+`userPreferences/{uid}` documents.
+
+## Safety
+
+- The script uses the Firebase **client** SDK only (`createUserWithEmailAndPassword`) —
+  there is no Admin SDK, no service account key, and nothing privileged to leak.
+- It refuses to run when `NODE_ENV=production`.
+- It refuses to run unless `ALLOW_TEST_SEED=true` is explicitly passed.
+- Firebase config comes from `.env` / `.env.local` (already git-ignored) — the same
+  `VITE_FIREBASE_*` values the app ships with client-side, not a secret.
+
+## Dev-only quick login
+
+When running in development (`import.meta.env.PROD === false`), the Login screen shows a
+"測試帳號快速登入" panel with one-tap buttons for these 3 accounts. This panel is
+completely absent from production builds.
diff --git a/firestore.indexes.json b/firestore.indexes.json
index 59a1e9e..813df28 100644
--- a/firestore.indexes.json
+++ b/firestore.indexes.json
@@ -7,6 +7,57 @@
         { "fieldPath": "vehicleId", "order": "ASCENDING" },
         { "fieldPath": "createdAt", "order": "DESCENDING" }
       ]
+    },
+    {
+      "collectionGroup": "conversations",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "memberIds", "arrayConfig": "CONTAINS" },
+        { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
+      ]
+    },
+    {
+      "collectionGroup": "discussionPosts",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "status", "order": "ASCENDING" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
+    },
+    {
+      "collectionGroup": "discussionPosts",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "status", "order": "ASCENDING" },
+        { "fieldPath": "likeCount", "order": "DESCENDING" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
+    },
+    {
+      "collectionGroup": "discussionPosts",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "status", "order": "ASCENDING" },
+        { "fieldPath": "featured", "order": "ASCENDING" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
+    },
+    {
+      "collectionGroup": "discussionPosts",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "status", "order": "ASCENDING" },
+        { "fieldPath": "authorId", "order": "ASCENDING" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
+    },
+    {
+      "collectionGroup": "discussionPosts",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "authorId", "order": "ASCENDING" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
     }
   ],
   "fieldOverrides": []
diff --git a/firestore.rules b/firestore.rules
index 26fac2f..03ffc6c 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -1,13 +1,122 @@
 rules_version = '2';
 
-// V0.1: any signed-in user can read/write. This is intentionally permissive
-// for skeleton testing — real per-collection authorization (who can create
-// a Verification, who can edit a Vehicle they don't own, etc.) is designed
-// before the real verification flow ships.
+// Freeze Zone: vehicles / verifications (+ answers/evidence subcollections) /
+// userPreferences / voltageSessions keep the exact V0.1 "any signed-in user
+// can read/write" behavior they always had. Do not tighten these — the
+// Verification engine's regression safety net assumes this stays unchanged.
+//
+// Everything below that is new for the Message Center / Discussion Center
+// (conversations, discussionPosts, discussionReports, users/{uid} profiles
+// and their blockedUsers/following/savedPosts subcollections) gets real
+// per-collection authorization instead of inheriting an open catch-all,
+// since it holds private 1:1 messages and user-owned state.
 service cloud.firestore {
   match /databases/{database}/documents {
-    match /{document=**} {
+    match /vehicles/{document=**} {
       allow read, write: if request.auth != null;
     }
+
+    match /verifications/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    match /userPreferences/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    match /voltageSessions/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    // --- Home/Marketplace DEMO content (seeded via scripts/seed-marketplace-mock.mjs) ---
+    // Global reference content, not user-owned — any signed-in user reads it,
+    // same open-write posture as the Freeze Zone collections above since only
+    // the seed script ever writes here.
+    match /marketplaceListings/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    match /featuredDealers/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    match /myListings/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    match /vehicleNews/{document=**} {
+      allow read, write: if request.auth != null;
+    }
+
+    // --- users/{uid} profile + owned subcollections ---
+    match /users/{userId} {
+      allow read: if request.auth != null;
+      allow write: if request.auth != null && request.auth.uid == userId;
+
+      // isBlocked() checks both directions of a pair, so reads stay open;
+      // only the owner may add/remove their own block list.
+      match /blockedUsers/{targetUid} {
+        allow read: if request.auth != null;
+        allow write: if request.auth != null && request.auth.uid == userId;
+      }
+
+      match /following/{targetUid} {
+        allow read: if request.auth != null;
+        allow write: if request.auth != null && request.auth.uid == userId;
+      }
+
+      match /savedPosts/{postId} {
+        allow read, write: if request.auth != null && request.auth.uid == userId;
+      }
+    }
+
+    // --- Message Center: conversations/{id} + messages/{id} ---
+    match /conversations/{conversationId} {
+      allow read: if request.auth != null && request.auth.uid in resource.data.memberIds;
+      allow create: if request.auth != null && request.auth.uid in request.resource.data.memberIds;
+      // Membership can't be forged or changed after creation — only the
+      // conversation's mutable fields (lastMessage, unreadCounts, tag, ...)
+      // may be updated by a member.
+      allow update: if request.auth != null
+        && request.auth.uid in resource.data.memberIds
+        && request.resource.data.memberIds == resource.data.memberIds;
+
+      match /messages/{messageId} {
+        allow read: if request.auth != null
+          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.memberIds;
+        allow create: if request.auth != null
+          && request.auth.uid == request.resource.data.senderId
+          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.memberIds;
+      }
+    }
+
+    // --- Discussion Center: discussionPosts/{id} + comments/{id} + likes/{uid} ---
+    match /discussionPosts/{postId} {
+      allow read: if request.auth != null;
+      allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
+      // The author can edit/delete freely; any other signed-in user may only
+      // ever touch likeCount/commentCount, which is exactly what the like
+      // transaction and the comment writeBatch do — never title/body/status.
+      allow update: if request.auth != null
+        && (request.auth.uid == resource.data.authorId
+          || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likeCount', 'commentCount']));
+      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
+
+      match /comments/{commentId} {
+        allow read: if request.auth != null;
+        allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
+        allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
+      }
+
+      match /likes/{uid} {
+        allow read: if request.auth != null;
+        allow write: if request.auth != null && request.auth.uid == uid;
+      }
+    }
+
+    match /discussionReports/{reportId} {
+      allow create: if request.auth != null && request.auth.uid == request.resource.data.reporterId;
+      allow read, update, delete: if false;
+    }
   }
 }
diff --git a/package-lock.json b/package-lock.json
index 43d8ae7..71b3b55 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -23,6 +23,7 @@
       "devDependencies": {
         "@capacitor/cli": "^8.5.0",
         "@eslint/js": "^10.0.1",
+        "@playwright/test": "^1.62.1",
         "@types/node": "^24.13.3",
         "@vitejs/plugin-vue": "^6.0.8",
         "@vue/eslint-config-prettier": "^10.2.0",
@@ -1371,6 +1372,22 @@
         "url": "https://opencollective.com/pkgr"
       }
     },
+    "node_modules/@playwright/test": {
+      "version": "1.62.1",
+      "resolved": "https://registry.npmjs.org/@playwright/test/-/test-1.62.1.tgz",
+      "integrity": "sha512-DTcUc8qii+cpHvtOwggMtBRMjKZHXYWdw8syRYu2vtzuq4Wxphqq4NfCs5Zt44L6mA8rfDfj+PHnxFc/FeK6mQ==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "dependencies": {
+        "playwright": "1.62.1"
+      },
+      "bin": {
+        "playwright": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
     "node_modules/@protobufjs/aspromise": {
       "version": "1.1.2",
       "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
@@ -4292,6 +4309,53 @@
         "pathe": "^2.0.3"
       }
     },
+    "node_modules/playwright": {
+      "version": "1.62.1",
+      "resolved": "https://registry.npmjs.org/playwright/-/playwright-1.62.1.tgz",
+      "integrity": "sha512-0M+L3LAD8/nm554LOla9Ayx0j0tmFZ0FBcoQ7F1VuVHpM/XpiC8RcDzBQB8W5+hA8L22THxELzeF+2WcUzvcLg==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "dependencies": {
+        "playwright-core": "1.62.1"
+      },
+      "bin": {
+        "playwright": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      },
+      "optionalDependencies": {
+        "fsevents": "2.3.2"
+      }
+    },
+    "node_modules/playwright-core": {
+      "version": "1.62.1",
+      "resolved": "https://registry.npmjs.org/playwright-core/-/playwright-core-1.62.1.tgz",
+      "integrity": "sha512-wPYSwEBJY9GHraISXqyqtx0na0LpO3XEX7jNDhntbex7tzUS7kLnZsOlFruFJB4Hi/rhDMjXGqHewDZ68nYZVw==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "bin": {
+        "playwright-core": "cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
+    "node_modules/playwright/node_modules/fsevents": {
+      "version": "2.3.2",
+      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.2.tgz",
+      "integrity": "sha512-xiqMQR4xAeHTuB9uWm+fFRcIOgKBMiOBP+eXiyT7jsgVCq1bkVygt00oASowB7EdtpOHaaPgKt812P9ab+DDKA==",
+      "dev": true,
+      "hasInstallScript": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
+      }
+    },
     "node_modules/plist": {
       "version": "3.1.1",
       "resolved": "https://registry.npmjs.org/plist/-/plist-3.1.1.tgz",
diff --git a/package.json b/package.json
index 210cebc..3aad764 100644
--- a/package.json
+++ b/package.json
@@ -9,6 +9,12 @@
     "preview": "vite preview",
     "lint": "eslint . --fix",
     "format": "prettier --write src/",
+    "test:e2e": "playwright test",
+    "seed:test-users": "node scripts/seed-test-users.mjs",
+    "seed:demo-data": "node scripts/seed-demo-data.mjs",
+    "seed:mock-vehicles": "node scripts/seed-mock-vehicles.mjs",
+    "seed:marketplace-mock": "node scripts/seed-marketplace-mock.mjs",
+    "cleanup:database": "node scripts/cleanup-database.mjs",
     "cap:sync": "npm run build && npx cap sync",
     "cap:android": "npx cap open android",
     "cap:ios": "npx cap open ios"
@@ -29,6 +35,7 @@
   "devDependencies": {
     "@capacitor/cli": "^8.5.0",
     "@eslint/js": "^10.0.1",
+    "@playwright/test": "^1.62.1",
     "@types/node": "^24.13.3",
     "@vitejs/plugin-vue": "^6.0.8",
     "@vue/eslint-config-prettier": "^10.2.0",
diff --git a/playwright.config.ts b/playwright.config.ts
new file mode 100644
index 0000000..b2baaf1
--- /dev/null
+++ b/playwright.config.ts
@@ -0,0 +1,30 @@
+import { defineConfig, devices } from '@playwright/test'
+
+/**
+ * E2E config. Tests assume a dev server is already running at BASE_URL
+ * (npm run dev -- --port 5174) — they are NOT wired to auto-start one,
+ * since several suites need multiple independent browser contexts against
+ * the same live Firebase project (see tests/e2e/social-realtime.spec.ts).
+ */
+export default defineConfig({
+  testDir: './tests/e2e',
+  timeout: 60_000,
+  expect: { timeout: 10_000 },
+  fullyParallel: false,
+  workers: 1,
+  reporter: [['list']],
+  use: {
+    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5174',
+    viewport: { width: 390, height: 844 },
+    screenshot: 'only-on-failure',
+  },
+  // devices['Desktop Chrome'] carries its own viewport, which otherwise
+  // silently overrides the 390x844 mobile viewport above — pin it back so
+  // every spec actually runs at mobile width, not desktop.
+  projects: [
+    {
+      name: 'mobile-chromium',
+      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
+    },
+  ],
+})
diff --git a/scripts/cleanup-database.mjs b/scripts/cleanup-database.mjs
new file mode 100644
index 0000000..b536a1b
--- /dev/null
+++ b/scripts/cleanup-database.mjs
@@ -0,0 +1,149 @@
+/**
+ * Dev/QA-only cleanup for the `vehicles` and `verifications` collections
+ * (+ their `answers`/`evidence` subcollections) in the live Firestore
+ * project. Months of Playwright regression runs (each creating a fresh
+ * throwaway account + blank vehicle + verification) and the pre-engine/
+ * chassis-number naming-step flow left this collection full of vehicles
+ * that can never satisfy the new archiving rule (both 引擎號碼 and 車身號碼
+ * required — see seller-verification.ts PREP-01). Rather than triage which
+ * of those are salvageable, this wipes both collections outright; run
+ * `npm run seed:mock-vehicles` afterwards to repopulate clean demo data.
+ *
+ * Does NOT touch Firebase Storage (uploaded evidence photos/videos from past
+ * e2e runs are left in place — out of scope for this pass) or any other
+ * collection (conversations, discussionPosts, users, ...).
+ *
+ * Uses the Firebase client SDK only, signed in as the seeded 測試賣家
+ * account — the Firestore rules leave `vehicles`/`verifications` open to any
+ * signed-in user (see the Freeze Zone comment in firestore.rules), so this
+ * needs no Admin SDK / service account key.
+ *
+ * Same production guard as scripts/seed-test-users.mjs. Dry-run by default —
+ * pass --confirm to actually delete.
+ *
+ * Usage:
+ *   ALLOW_TEST_SEED=true node scripts/cleanup-database.mjs           # dry run
+ *   ALLOW_TEST_SEED=true node scripts/cleanup-database.mjs --confirm # deletes
+ */
+import { readFileSync, existsSync } from 'node:fs'
+import { fileURLToPath } from 'node:url'
+import path from 'node:path'
+
+import { initializeApp } from 'firebase/app'
+import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
+import { collection, getDocs, getFirestore, writeBatch } from 'firebase/firestore'
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url))
+const rootDir = path.resolve(__dirname, '..')
+
+function loadEnvFile(filePath) {
+  if (!existsSync(filePath)) return {}
+  const result = {}
+  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
+    const trimmed = line.trim()
+    if (!trimmed || trimmed.startsWith('#')) continue
+    const eq = trimmed.indexOf('=')
+    if (eq === -1) continue
+    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
+  }
+  return result
+}
+
+function guardEnvironment() {
+  if (process.env.NODE_ENV === 'production') {
+    console.error('[cleanup-database] Refusing to run: NODE_ENV=production.')
+    process.exit(1)
+  }
+  if (process.env.ALLOW_TEST_SEED !== 'true') {
+    console.error(
+      '[cleanup-database] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
+    )
+    process.exit(1)
+  }
+}
+
+const BATCH_SIZE = 400
+
+async function deleteRefsInBatches(db, refs) {
+  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
+    const batch = writeBatch(db)
+    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref)
+    await batch.commit()
+  }
+}
+
+async function main() {
+  guardEnvironment()
+  const confirm = process.argv.includes('--confirm')
+
+  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
+  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
+  const env = { ...envDefault, ...envLocal, ...process.env }
+  const firebaseConfig = {
+    apiKey: env.VITE_FIREBASE_API_KEY,
+    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
+    projectId: env.VITE_FIREBASE_PROJECT_ID,
+    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
+    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
+    appId: env.VITE_FIREBASE_APP_ID,
+  }
+  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
+    console.error('[cleanup-database] Missing Firebase config — check .env / .env.local.')
+    process.exit(1)
+  }
+
+  const app = initializeApp(firebaseConfig)
+  const auth = getAuth(app)
+  const db = getFirestore(app)
+  await signInWithEmailAndPassword(auth, 'seller@motoverify.test', 'MotoVerify123!')
+
+  console.log(
+    `[cleanup-database] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
+  )
+
+  const [vehicleSnapshot, verificationSnapshot] = await Promise.all([
+    getDocs(collection(db, 'vehicles')),
+    getDocs(collection(db, 'verifications')),
+  ])
+
+  let answerCount = 0
+  let evidenceCount = 0
+  const subcollectionRefs = []
+  for (const verificationDoc of verificationSnapshot.docs) {
+    const [answers, evidence] = await Promise.all([
+      getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
+      getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
+    ])
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit b828246

---

### 第三版完整內容 `372cac8`

- 使用者：li220fish
- 時間：2026-09-01 20:59
- 分類：前台
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/firestore.rules b/firestore.rules
index 03ffc6c..8b5b6ae 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -68,6 +68,10 @@ service cloud.firestore {
       match /savedPosts/{postId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
+
+      match /favoriteListings/{listingId} {
+        allow read, write: if request.auth != null && request.auth.uid == userId;
+      }
     }
 
     // --- Message Center: conversations/{id} + messages/{id} ---
diff --git a/scripts/cleanup-database.mjs b/scripts/cleanup-database.mjs
index b536a1b..dfd0d02 100644
--- a/scripts/cleanup-database.mjs
+++ b/scripts/cleanup-database.mjs
@@ -1,13 +1,23 @@
 /**
- * Dev/QA-only cleanup for the `vehicles` and `verifications` collections
- * (+ their `answers`/`evidence` subcollections) in the live Firestore
- * project. Months of Playwright regression runs (each creating a fresh
- * throwaway account + blank vehicle + verification) and the pre-engine/
- * chassis-number naming-step flow left this collection full of vehicles
- * that can never satisfy the new archiving rule (both 引擎號碼 and 車身號碼
- * required — see seller-verification.ts PREP-01). Rather than triage which
- * of those are salvageable, this wipes both collections outright; run
- * `npm run seed:mock-vehicles` afterwards to repopulate clean demo data.
+ * Dev/QA-only cleanup for THROWAWAY vehicles/verifications created by the
+ * Playwright regression suite (tests/e2e/verification-regression.spec.ts's
+ * registerAndLogin() + naming-step flow creates a vehicle with `model` set
+ * to whatever name was typed in the naming step, e.g. "Regression Seller" —
+ * see TEST_VEHICLE_NAME_PREFIXES below).
+ *
+ * IMPORTANT: this used to wipe the ENTIRE `vehicles`/`verifications`
+ * collections unconditionally, regardless of owner. That also deleted any
+ * real vehicle a real user (or a test account) had added through the live
+ * app if this script happened to run while they were using it — a genuine
+ * incident, not hypothetical. This is now scoped to ONLY vehicles whose
+ * `model` matches a known throwaway-test naming prefix (and only those
+ * vehicles' own verifications + answers/evidence subcollections) — the 5
+ * seeded demo vehicles (real brand/model like "HONDA"/"PCX 160") and
+ * anything a real user or test account adds themselves are never touched.
+ *
+ * If a future regression spec creates named vehicles some other way, add
+ * its prefix to TEST_VEHICLE_NAME_PREFIXES rather than reverting to a full
+ * wipe.
  *
  * Does NOT touch Firebase Storage (uploaded evidence photos/videos from past
  * e2e runs are left in place — out of scope for this pass) or any other
@@ -36,6 +46,13 @@ import { collection, getDocs, getFirestore, writeBatch } from 'firebase/firestor
 const __dirname = path.dirname(fileURLToPath(import.meta.url))
 const rootDir = path.resolve(__dirname, '..')
 
+const TEST_VEHICLE_NAME_PREFIXES = ['Regression', 'Archive Gate Test', 'Throwaway']
+
+function isThrowawayVehicle(data) {
+  const model = typeof data.model === 'string' ? data.model : ''
+  return TEST_VEHICLE_NAME_PREFIXES.some((prefix) => model.startsWith(prefix))
+}
+
 function loadEnvFile(filePath) {
   if (!existsSync(filePath)) return {}
   const result = {}
@@ -101,15 +118,19 @@ async function main() {
     `[cleanup-database] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
   )
 
-  const [vehicleSnapshot, verificationSnapshot] = await Promise.all([
-    getDocs(collection(db, 'vehicles')),
-    getDocs(collection(db, 'verifications')),
-  ])
+  const vehicleSnapshot = await getDocs(collection(db, 'vehicles'))
+  const throwawayVehicleDocs = vehicleSnapshot.docs.filter((d) => isThrowawayVehicle(d.data()))
+  const throwawayVehicleIds = new Set(throwawayVehicleDocs.map((d) => d.id))
+
+  const verificationSnapshot = await getDocs(collection(db, 'verifications'))
+  const throwawayVerificationDocs = verificationSnapshot.docs.filter((d) =>
+    throwawayVehicleIds.has(d.data().vehicleId),
+  )
 
   let answerCount = 0
   let evidenceCount = 0
   const subcollectionRefs = []
-  for (const verificationDoc of verificationSnapshot.docs) {
+  for (const verificationDoc of throwawayVerificationDocs) {
     const [answers, evidence] = await Promise.all([
       getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
       getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
@@ -119,11 +140,18 @@ async function main() {
     subcollectionRefs.push(...answers.docs.map((d) => d.ref), ...evidence.docs.map((d) => d.ref))
   }
 
-  console.log(`[cleanup-database] vehicles:      ${vehicleSnapshot.size}`)
   console.log(
-    `[cleanup-database] verifications: ${verificationSnapshot.size} (answers: ${answerCount}, evidence: ${evidenceCount})`,
+    `[cleanup-database] vehicles scanned: ${vehicleSnapshot.size}, throwaway (matched test-name prefix): ${throwawayVehicleDocs.length}`,
+  )
+  console.log(
+    `[cleanup-database] verifications scanned: ${verificationSnapshot.size}, throwaway: ${throwawayVerificationDocs.length} (answers: ${answerCount}, evidence: ${evidenceCount})`,
   )
 
+  if (throwawayVehicleDocs.length === 0 && throwawayVerificationDocs.length === 0) {
+    console.log('[cleanup-database] Nothing to clean up.')
+    process.exit(0)
+  }
+
   if (!confirm) {
     console.log('[cleanup-database] Dry run only — pass --confirm to actually delete.')
     process.exit(0)
@@ -132,14 +160,16 @@ async function main() {
   await deleteRefsInBatches(db, subcollectionRefs)
   await deleteRefsInBatches(
     db,
-    verificationSnapshot.docs.map((d) => d.ref),
+    throwawayVerificationDocs.map((d) => d.ref),
   )
   await deleteRefsInBatches(
     db,
-    vehicleSnapshot.docs.map((d) => d.ref),
+    throwawayVehicleDocs.map((d) => d.ref),
   )
 
-  console.log('[cleanup-database] Done — vehicles & verifications (+ subcollections) removed.')
+  console.log(
+    '[cleanup-database] Done — throwaway vehicles & verifications (+ subcollections) removed.',
+  )
   process.exit(0)
 }
 
diff --git a/scripts/seed-marketplace-mock.mjs b/scripts/seed-marketplace-mock.mjs
index b26ad1b..b618a6f 100644
--- a/scripts/seed-marketplace-mock.mjs
+++ b/scripts/seed-marketplace-mock.mjs
@@ -1,10 +1,16 @@
 /**
  * Dev/QA-only seed script for the Home/Marketplace DEMO content — pushes
- * MOCK_MARKET_LISTINGS / MOCK_FEATURED_DEALERS / MOCK_MY_LISTINGS /
- * MOCK_VEHICLE_NEWS into their own Firestore collections
- * (marketplaceListings / featuredDealers / myListings / vehicleNews) instead
- * of leaving them as static arrays baked into the JS bundle, so the app can
- * read (and this content can be updated) without a rebuild.
+ * MOCK_MARKET_LISTINGS / MOCK_FEATURED_DEALERS / MOCK_VEHICLE_NEWS into their
+ * own Firestore collections (marketplaceListings / featuredDealers /
+ * vehicleNews) instead of leaving them as static arrays baked into the JS
+ * bundle, so the app can read (and this content can be updated) without a
+ * rebuild.
+ *
+ * "我的刊登" (My Listings) no longer has its own separate mock collection —
+ * it's real user data now, scoped by `sellerId` on `marketplaceListings`
+ * itself (see src/services/firebase/listing.service.ts and
+ * scripts/seed-my-listings.mjs for seeding the 3 test accounts' own
+ * listings).
  *
  * This mirrors the arrays in src/data/home/*.ts BY HAND — plain .mjs can't
  * import those '@/'-aliased TS modules directly (same constraint noted in
@@ -214,32 +220,6 @@ const FEATURED_DEALERS = [
   { id: 'dealer-4', name: '雙輪車坊', rating: 4.5, reviewCount: 42, region: '高雄市' },
 ]
 
-// --- Mirrors src/data/home/my-listings-mock.ts ---
-const MY_LISTINGS = [
-  {
-    id: 'my-listing-1',
-    brand: 'HONDA',
-    model: 'CB300R',
-    year: 2017,
-    priceTwd: 150000,
-    status: 'active',
-    interestCount: 14,
-    imageUrl:
-      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda_CB300R_-_Mondial_de_l%27Automobile_de_Paris_2018_-_001.jpg/960px-Honda_CB300R_-_Mondial_de_l%27Automobile_de_Paris_2018_-_001.jpg',
-  },
-  {
-    id: 'my-listing-2',
-    brand: 'YAMAHA',
-    model: 'SMAX 155',
-    year: 2018,
-    priceTwd: 62000,
-    status: 'active',
-    interestCount: 7,
-    imageUrl:
-      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Yamaha_SMax.jpg/960px-Yamaha_SMax.jpg',
-  },
-]
-
 // --- Mirrors src/data/home/vehicle-news-mock.ts ---
 const VEHICLE_NEWS = [
   {
@@ -306,9 +286,6 @@ async function main() {
   await seedCollection(db, 'featuredDealers', FEATURED_DEALERS)
   console.log(`[seed-marketplace-mock] featuredDealers: ${FEATURED_DEALERS.length} docs`)
 
-  await seedCollection(db, 'myListings', MY_LISTINGS)
-  console.log(`[seed-marketplace-mock] myListings: ${MY_LISTINGS.length} docs`)
-
   await seedCollection(db, 'vehicleNews', VEHICLE_NEWS)
   console.log(`[seed-marketplace-mock] vehicleNews: ${VEHICLE_NEWS.length} docs`)
 
diff --git a/scripts/seed-mock-vehicles.mjs b/scripts/seed-mock-vehicles.mjs
index c54a88a..686ad99 100644
--- a/scripts/seed-mock-vehicles.mjs
+++ b/scripts/seed-mock-vehicles.mjs
@@ -23,6 +23,15 @@
  * Uses the Firebase client SDK only (same pattern as
  * scripts/seed-demo-data.mjs) — no Admin SDK / service account key.
  *
+ * Idempotent: before creating each of the 5 vehicles below, deletes any
+ * existing vehicle already owned by that same account with the same
+ * brand+model (plus its verification + answers/evidence), so re-running
+ * this script replaces the demo data in place instead of duplicating it.
+ * This matters because scripts/cleanup-database.mjs no longer wipes the
+ * whole `vehicles` collection before a reseed (that used to also delete
+ * real users' own vehicles as collateral damage) — this script now owns
+ * cleaning up its own prior output.
+ *
  * Usage:
  *   ALLOW_TEST_SEED=true node scripts/seed-mock-vehicles.mjs
  */
@@ -35,10 +44,14 @@ import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
 import {
   addDoc,
   collection,
+  deleteDoc,
   doc,
+  getDocs,
   getFirestore,
+  query,
   serverTimestamp,
   updateDoc,
+  where,
   writeBatch,
 } from 'firebase/firestore'
 
@@ -191,6 +204,39 @@ const PREP_SIMPLE_IDS = ['PREP-03', 'PREP-04', 'PREP-05']
 
 const SIMPLE_NORMAL_IDS = [...PREP_SIMPLE_IDS, ...CHK_IDS, ...APR_IDS, ...ELEC_IDS, ...ENG_IDS]
 
+/**
+ * Deletes any previously-seeded vehicle owned by `ownerUid` matching this
+ * exact brand+model (+ its verification and answers/evidence), so re-running
+ * this script replaces rather than duplicates. Filters client-side on
+ * brand/model after a single equality query on currentOwnerId, same
+ * composite-index-avoidance pattern as vehicleService.list().
+ */
+async function deleteExistingSeededVehicle(db, ownerUid, brand, model) {
+  const ownerVehicles = await getDocs(
+    query(collection(db, 'vehicles'), where('currentOwnerId', '==', ownerUid)),
+  )
+  const matches = ownerVehicles.docs.filter(
+    (d) => d.data().brand === brand && d.data().model === model,
+  )
+  for (const vehicleDoc of matches) {
+    const verifications = await getDocs(
+      query(collection(db, 'verifications'), where('vehicleId', '==', vehicleDoc.id)),
+    )
+    for (const verificationDoc of verifications.docs) {
+      const [answers, evidence] = await Promise.all([
+        getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
+        getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
+      ])
+      const batch = writeBatch(db)
+      for (const answerDoc of answers.docs) batch.delete(answerDoc.ref)
+      for (const evidenceDoc of evidence.docs) batch.delete(evidenceDoc.ref)
+      batch.delete(verificationDoc.ref)
+      await batch.commit()
+    }
+    await deleteDoc(vehicleDoc.ref)
+  }
+}
+
 async function main() {
   guardEnvironment()
 
@@ -226,6 +272,7 @@ async function main() {
   const results = []
   for (const vehicle of VEHICLES) {
     const ownerUid = vehicle.ownerUid ?? sellerUid
+    await deleteExistingSeededVehicle(db, ownerUid, vehicle.brand, vehicle.model)
     const vehicleRef = await addDoc(collection(db, 'vehicles'), {
       brand: vehicle.brand,
       model: vehicle.model,
diff --git a/scripts/seed-my-listings.mjs b/scripts/seed-my-listings.mjs
new file mode 100644
index 0000000..351b414
--- /dev/null
+++ b/scripts/seed-my-listings.mjs
@@ -0,0 +1,273 @@
+/**
+ * Dev/QA-only seed script ensuring each of the 3 test accounts
+ * (docs/test-accounts.md) has at least one real "我的刊登" listing in
+ * Firestore's `marketplaceListings` collection — the same collection the
+ * Marketplace browse page reads, scoped by `sellerId` for "我的刊登"
+ * (see src/services/firebase/listing.service.ts).
+ *
+ * Each listing is built from one of that account's OWN seeded vehicles
+ * (scripts/seed-mock-vehicles.mjs) that already has a completed 車輛驗證 —
+ * `verificationScore` is computed for real from that verification's actual
+ * answers (% normal, excluding 不適用), not fabricated.
+ *
+ * Idempotent: replaces any existing listing for the same sellerId+vehicleId
+ * pair rather than duplicating on re-run (same pattern as
+ * scripts/seed-mock-vehicles.mjs).
+ *
+ * Uses the Firebase client SDK only — firestore.rules leaves
+ * `marketplaceListings` (and `vehicles`/`verifications`) open to any
+ * signed-in user, so a single sign-in as 測試賣家 can read every account's
+ * vehicles/verifications and write listings on their behalf.
+ *
+ * Usage:
+ *   ALLOW_TEST_SEED=true node scripts/seed-my-listings.mjs
+ */
+import { readFileSync, existsSync } from 'node:fs'
+import { fileURLToPath } from 'node:url'
+import path from 'node:path'
+
+import { initializeApp } from 'firebase/app'
+import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
+import {
+  addDoc,
+  collection,
+  deleteDoc,
+  getDocs,
+  getFirestore,
+  query,
+  serverTimestamp,
+  where,
+} from 'firebase/firestore'
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url))
+const rootDir = path.resolve(__dirname, '..')
+
+function loadEnvFile(filePath) {
+  if (!existsSync(filePath)) return {}
+  const result = {}
+  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
+    const trimmed = line.trim()
+    if (!trimmed || trimmed.startsWith('#')) continue
+    const eq = trimmed.indexOf('=')
+    if (eq === -1) continue
+    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
+  }
+  return result
+}
+
+function guardEnvironment() {
+  if (process.env.NODE_ENV === 'production') {
+    console.error('[seed-my-listings] Refusing to run: NODE_ENV=production.')
+    process.exit(1)
+  }
+  if (process.env.ALLOW_TEST_SEED !== 'true') {
+    console.error(
+      '[seed-my-listings] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
+    )
+    process.exit(1)
+  }
+}
+
+const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
+const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'
+const BUYER_UID = 'e399kAhI9PNTmC2RqRT3K6tdiRq1'
+
+const TARGETS = [
+  {
+    sellerId: SELLER_UID,
+    sellerName: '測試賣家',
+    sellerType: 'individual',
+    vehicleBrand: 'HONDA',
+    vehicleModel: 'PCX 160',
+    priceTwd: 72000,
+    region: '台北市',
+    district: '大安區',
+    displacementCc: 150,
+    transmission: 'CVT 無段變速',
+    color: '珍珠白',
+    transferable: true,
+    modified: false,
+    description: '定期保養，車況良好，隨時歡迎預約賞車。',
+  },
+  {
+    sellerId: DEALER_UID,
+    sellerName: 'MotoVerify 車商',
+    sellerType: 'dealer',
+    vehicleBrand: 'KAWASAKI',
+    vehicleModel: 'Z900',
+    priceTwd: 285000,
+    region: '新北市',
+    district: '板橋區',
+    displacementCc: 948,
+    transmission: '6速手排',
+    color: '消光黑',
+    transferable: true,
+    modified: false,
+    description: '車商保證車，已完成專業檢驗，可協助貸款與過戶手續。',
+  },
+  {
+    sellerId: BUYER_UID,
+    sellerName: '測試買家',
+    sellerType: 'individual',
+    vehicleBrand: 'KYMCO',
+    vehicleModel: 'Agility 125',
+    priceTwd: 45000,
+    region: '台中市',
+    district: '西區',
+    displacementCc: 125,
+    transmission: 'CVT 無段變速',
+    color: '紅色',
+    transferable: true,
+    modified: false,
+    description: '通勤代步車，油耗表現佳，龍頭手把新換。',
+  },
+]
+
+// Example availability so the 3 seeded listings are immediately bookable —
+// every 3rd day for the next 3 weeks, same 5 time slots each day (matches
+// the reference design's shared-slots-per-day layout).
+function generateAvailableDates(daysAhead, stepDays) {
+  const dates = []
+  const start = new Date()
+  start.setDate(start.getDate() + 1)
+  for (let offset = 0; offset < daysAhead; offset += stepDays) {
+    const date = new Date(start)
+    date.setDate(date.getDate() + offset)
+    const year = date.getFullYear()
+    const month = String(date.getMonth() + 1).padStart(2, '0')
+    const day = String(date.getDate()).padStart(2, '0')
+    dates.push(`${year}-${month}-${day}`)
+  }
+  return dates
+}
+
+const DEFAULT_AVAILABLE_DATES = generateAvailableDates(21, 3)
+const DEFAULT_TIME_SLOTS = ['10:00', '11:30', '14:00', '16:00', '18:00']
+
+async function computeVerificationScore(db, vehicleId) {
+  const verificationsSnapshot = await getDocs(
+    query(collection(db, 'verifications'), where('vehicleId', '==', vehicleId)),
+  )
+  const completed = verificationsSnapshot.docs.find(
+    (d) => d.data().type === 'seller' && d.data().status === 'completed',
+  )
+  if (!completed) return null
+  const answersSnapshot = await getDocs(collection(db, 'verifications', completed.id, 'answers'))
+  const answers = answersSnapshot.docs.map((d) => d.data())
+  const eligible = answers.filter((answer) => answer.result !== 'not_applicable')
+  if (eligible.length === 0) return 100
+  const normalCount = eligible.filter((answer) => answer.result === 'normal').length
+  return Math.round((normalCount / eligible.length) * 100)
+}
+
+async function deleteExistingListing(db, sellerId, vehicleId) {
+  const snapshot = await getDocs(
+    query(
+      collection(db, 'marketplaceListings'),
+      where('sellerId', '==', sellerId),
+      where('vehicleId', '==', vehicleId),
+    ),
+  )
+  for (const listingDoc of snapshot.docs) await deleteDoc(listingDoc.ref)
+}
+
+async function main() {
+  guardEnvironment()
+
+  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
+  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
+  const env = { ...envDefault, ...envLocal, ...process.env }
+  const firebaseConfig = {
+    apiKey: env.VITE_FIREBASE_API_KEY,
+    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
+    projectId: env.VITE_FIREBASE_PROJECT_ID,
+    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
+    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
+    appId: env.VITE_FIREBASE_APP_ID,
+  }
+  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
+    console.error('[seed-my-listings] Missing Firebase config — check .env / .env.local.')
+    process.exit(1)
+  }
+
+  const app = initializeApp(firebaseConfig)
+  const auth = getAuth(app)
+  const db = getFirestore(app)
+  await signInWithEmailAndPassword(auth, 'seller@motoverify.test', 'MotoVerify123!')
+
+  console.log(`[seed-my-listings] Seeding into Firebase project: ${firebaseConfig.projectId}`)
+
+  const results = []
+  for (const target of TARGETS) {
+    const vehiclesSnapshot = await getDocs(
+      query(collection(db, 'vehicles'), where('currentOwnerId', '==', target.sellerId)),
+    )
+    const vehicleDoc = vehiclesSnapshot.docs.find(
+      (d) => d.data().brand === target.vehicleBrand && d.data().model === target.vehicleModel,
+    )
+    if (!vehicleDoc) {
+      console.warn(
+        `[seed-my-listings] Skipped ${target.sellerName}: no ${target.vehicleBrand} ${target.vehicleModel} vehicle found for this owner.`,
+      )
+      continue
+    }
+    const vehicle = vehicleDoc.data()
+    const verificationScore = await computeVerificationScore(db, vehicleDoc.id)
+    i
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 372cac8

---

## 2026年9月2日 週三

### 開會對 APP／後台功能測試

- 使用者：li220fish
- 時間：2026-09-02
- 分類：系統
- 類型：測試

#### 摘要
功能與流程討論

#### 結果
驗證完成，功能確定上線（結案：2026-09-02）

#### 時數
2

---

### 假資料

- 使用者：li220fish
- 時間：2026-09-02 ～ 2026-09-04
- 分類：系統
- 類型：開發

#### 摘要
內容定表、繪製儲存圖；假帳號、車子資訊等

#### 結果
實作中，需求尚未完成（結案：2026-09-04）

#### 時數
7

---

### Update fmt.Println message from 'Hello' to 'Goodbye' `ab67ab6`

- 使用者：Archi
- 時間：2026-09-02 17:16
- 分類：系統
- 類型：其他

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/backstage_admin_v0.1 b/backstage_admin_v0.1
new file mode 100644
index 0000000..0c0d211
--- /dev/null
+++ b/backstage_admin_v0.1
@@ -0,0 +1,1233 @@
+<!DOCTYPE html>
+<html lang="zh-Hant">
+<head>
+<meta charset="utf-8">
+<meta name="viewport" content="width=device-width, initial-scale=1">
+<title>MotoVerify 營運後台</title>
+<!--
+  空白框架版。所有示範資料已清除，保留版面、欄位定義與設計約束。
+  接 Firestore 時：每個表格上的 data-collection 標出對應的 collection，
+  每個 [data-metric] 標出該填入的指標名稱。
+  專案 motorcycle-verification / Firebase Auth + Cloud Firestore。
+  接資料前先完成 admin custom claim 與 security rules，UI 不是安全邊界。
+-->
+<style>
+:root{
+  --ink:#131A24; --ink-2:#1C2530;
+  --ground:#EEF1F5; --surface:#FFFFFF;
+  --line:#D8DEE7; --line-soft:#E7EBF1;
+  --text:#1A222E; --muted:#5B6577; --faint:#8A94A6;
+  --action:#1D4ED8; --action-soft:#EAF0FE;
+  --attention:#B45309; --attention-soft:#FDF3E6;
+  --risk:#B42318; --risk-soft:#FDEDEB;
+  --ok:#067647; --ok-soft:#E8F5EF;
+  --rail:250px;
+}
+*{box-sizing:border-box;margin:0;padding:0}
+html{-webkit-text-size-adjust:100%}
+body{
+  font-family:"Noto Sans TC","PingFang TC","Hiragino Sans TC",system-ui,-apple-system,"Segoe UI",sans-serif;
+  background:var(--ground);color:var(--text);font-size:14px;line-height:1.6;
+  font-variant-numeric:tabular-nums;
+}
+:focus-visible{outline:2px solid var(--action);outline-offset:2px;border-radius:3px}
+@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
+
+.shell{display:flex;min-height:100vh}
+.rail{width:var(--rail);flex:0 0 var(--rail);background:var(--ink);color:#C6CEDA;
+  padding:20px 0 40px;position:sticky;top:0;height:100vh;overflow-y:auto}
+.brand{display:flex;align-items:center;gap:9px;padding:0 20px 18px;border-bottom:1px solid #263042;margin-bottom:14px}
+.brand-mark{width:26px;height:26px;border-radius:7px;background:var(--action);display:grid;place-items:center;flex:0 0 26px}
+.brand-mark svg{width:15px;height:15px}
+.brand-name{color:#fff;font-weight:700;font-size:15px}
+.brand-sub{font-size:11px;color:#7C8798;margin-top:-2px}
+.nav-group{margin-bottom:15px}
+.nav-group h3{padding:0 20px 5px;font-size:11px;font-weight:600;color:#6B7688}
+.nav-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 20px;
+  background:none;border:0;cursor:pointer;color:#C6CEDA;font:inherit;font-size:13.5px;
+  border-left:2px solid transparent;text-align:left}
+.nav-item:hover{background:#1B2431;color:#fff}
+.nav-item[aria-current="page"]{background:var(--ink-2);color:#fff;border-left-color:var(--action);font-weight:600}
+.nav-label{flex:1}
+.nav-count{font-size:11px;padding:1px 6px;border-radius:9px;background:#2E3A4C;color:#B9C3D2;font-weight:600}
+.nav-count:empty{display:none}
+.nav-count.hot{background:var(--attention);color:#fff}
+
+.main{flex:1;min-width:0;display:flex;flex-direction:column}
+.topbar{background:var(--surface);border-bottom:1px solid var(--line);padding:13px 26px;
+  display:flex;align-items:center;gap:16px;flex-wrap:wrap;position:sticky;top:0;z-index:5}
+.topbar h1{font-size:17px;font-weight:700}
+.crumb{font-size:12px;color:var(--faint)}
+.topbar-spacer{flex:1}
+.op{font-size:12.5px;color:var(--muted)}
+.op b{color:var(--text);font-weight:600}
+
+.page{padding:22px 26px 60px;max-width:1280px}
+.page[hidden]{display:none}
+.page-intro{font-size:13px;color:var(--muted);margin-bottom:18px;max-width:70ch}
+
+.strip{display:flex;background:var(--surface);border:1px solid var(--line);
+  border-radius:10px;overflow:hidden;margin-bottom:20px;flex-wrap:wrap}
+.strip>div{flex:1;min-width:145px;padding:13px 17px;border-left:1px solid var(--line-soft)}
+.strip>div:first-child{border-left:0}
+.strip dt{font-size:12px;color:var(--muted);margin-bottom:2px}
+.strip dd{font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.2;color:var(--faint)}
+.strip .note{font-size:11.5px;color:var(--faint);margin-top:2px}
+
+.panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;margin-bottom:18px}
+.panel-head{padding:12px 17px;border-bottom:1px solid var(--line-soft);
+  display:flex;align-items:center;gap:11px;flex-wrap:wrap}
+.panel-head h2{font-size:14.5px;font-weight:700}
+.panel-head .sub{font-size:12px;color:var(--faint)}
+.panel-head .spacer{flex:1}
+.panel-body{padding:17px}
+.panel-body.flush{padding:0}
+.ref{font-size:11px;padding:2px 7px;border-radius:4px;background:#F0F3F8;color:var(--muted);font-weight:600;white-space:nowrap}
+.ref.app{background:var(--action-soft);color:var(--action)}
+.ref.new{background:var(--attention-soft);color:var(--attention)}
+
+table{width:100%;border-collapse:collapse;font-size:13px}
+th{text-align:left;font-weight:600;color:var(--muted);font-size:12px;
+  padding:9px 17px;border-bottom:1px solid var(--line);background:#F7F9FC;white-space:nowrap}
+td{padding:10px 17px;border-bottom:1px solid var(--line-soft);vertical-align:middle}
+tr:last-child td{border-bottom:0}
+.num{text-align:right}
+.strong{font-weight:600}
+.dim{color:var(--muted);font-size:12.5px}
+.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
+tbody tr.clickable{cursor:pointer}
+tbody tr.clickable:hover{background:#F4F7FC}
+td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:12.5px}
+
+.pill{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:20px;white-space:nowrap}
+.pill.ok{background:var(--ok-soft);color:var(--ok)}
+.pill.attn{background:var(--attention-soft);color:var(--attention)}
+.pill.risk{background:var(--risk-soft);color:var(--risk)}
+.pill.info{background:var(--action-soft);color:var(--action)}
+.pill.mute{background:#F0F3F8;color:var(--muted)}
+
+.btn{font:inherit;font-size:13px;font-weight:600;padding:6px 13px;border-radius:7px;
+  border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer}
+.btn:hover{background:#F5F7FA}
+.btn.primary{background:var(--action);border-color:var(--action);color:#fff}
+.btn.primary:hover{background:#1A44BC}
+.btn.danger{color:var(--risk);border-color:#E9C4C0}
+.btn.danger:hover{background:var(--risk-soft)}
+.btn.sm{padding:3px 10px;font-size:12px}
+.btn[disabled]{opacity:.45;cursor:not-allowed}
+
+.guard{border:1px solid #E9C4C0;background:var(--risk-soft);border-radius:9px;
+  padding:12px 15px;margin-bottom:17px;display:flex;gap:11px;align-items:flex-start}
+.guard.amber{border-color:#E4C79C;background:var(--attention-soft)}
+.guard svg{flex:0 0 17px;width:17px;height:17px;margin-top:2px;color:var(--risk)}
+.guard.amber svg{color:var(--attention)}
+.guard h4{font-size:13px;font-weight:700;color:var(--risk);margin-bottom:3px}
+.guard.amber h4{color:var(--attention)}
+.guard p{font-size:12.5px;color:#7A2B24;line-height:1.65}
+.guard.amber p{color:#7C4A0C}
+.guard code{background:#fff;padding:1px 5px;border-radius:3px;font-size:11.5px;border:1px solid currentColor}
+
+.stack-note{font-size:12.5px;color:var(--muted);padding:11px 14px;background:#F7F9FC;
+  border:1px solid var(--line-soft);border-radius:8px;line-height:1.7}
+.stack-note b{color:var(--text)}
+.split{display:grid;grid-template-columns:1fr 1fr;gap:18px}
+
+.bar{height:7px;background:#E7EBF1;border-radius:4px;overflow:hidden;min-width:70px}
+.bar i{display:block;height:100%;background:var(--action);border-radius:4px}
+
+.filters{display:flex;gap:6px;flex-wrap:wrap}
+.chip{font:inherit;font-size:12.5px;padding:4px 12px;border-radius:16px;cursor:pointer;
+  border:1px solid var(--line);background:var(--surface);color:var(--muted)}
+.chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff;font-weight:600}
+
+.search{font:inherit;font-size:13px;padding:6px 12px;border:1px solid var(--line);
+  border-radius:7px;min-width:220px;color:var(--text)}
+.search:focus{outline:none;border-color:var(--action);box-shadow:0 0 0 3px var(--action-soft)}
+
+.udetail{display:grid;grid-template-columns:290px minmax(0,1fr);gap:0}
+.uside{padding:18px;border-right:1px solid var(--line-soft);background:#F7F9FC}
+.uavatar{width:54px;height:54px;border-radius:14px;background:#E7EBF1;color:var(--faint);
+  display:grid;place-items:center;font-size:21px;font-weight:700;margin-bottom:11px}
+.uname{font-size:17px;font-weight:700;line-height:1.3;color:var(--faint)}
+.ucode{font-size:12.5px;color:var(--muted);margin-top:1px}
+.ufacts{margin-top:15px;font-size:12.5px}
+.ufacts div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line-soft)}
+.ufacts div:last-child{border-bottom:0}
+.ufacts dt{color:var(--muted)}
+.ufacts dd{font-weight:600;text-align:right;color:var(--faint)}
+.umain{padding:18px;display:flex;flex-direction:column;gap:16px;min-width:0}
+.usec h3{font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px}
+
+.slot{border:1px dashed var(--line);border-radius:8px;padding:22px 13px;text-align:center;
+  font-size:12.5px;color:var(--faint)}
+
+.heat{display:flex;flex-direction:column;gap:7px}
+.heatrow{display:flex;align-items:center;gap:10px;font-size:12.5px}
+.heatrow .lbl{width:80px;flex:0 0 80px;color:var(--muted)}
+.heatrow .val{width:56px;flex:0 0 56px;text-align:right;font-weight:600;font-size:12px;color:var(--faint)}
+
+.datasrc{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
+  padding:2px 8px;border-radius:4px;background:var(--attention-soft);color:var(--attention)}
+
+.setting{display:flex;align-items:flex-start;gap:13px;padding:13px 0;border-bottom:1px solid var(--line-soft)}
+.setting:last-child{border-bottom:0}
+.setting .txt{flex:1}
+.setting .txt b{font-size:13.5px;display:block}
+.setting .txt span{font-size:12.5px;color:var(--muted)}
+.tog{position:relative;width:42px;height:24px;flex:0 0 42px;border:0;border-radius:14px;
+  background:#C2C9D4;cursor:pointer;padding:0;transition:background .15s}
+.tog::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;
+  background:#fff;transition:transform .15s}
+.tog[aria-pressed="true"]{background:var(--action)}
+.tog[aria-pressed="true"]::after{transform:translateX(18px)}
+.tog.warn[aria-pressed="true"]{background:var(--attention)}
+
+.checker textarea{width:100%;min-height:100px;font:inherit;font-size:13.5px;line-height:1.7;
+  padding:12px;border:1px solid var(--line);border-radius:8px;resize:vertical;color:var(--text)}
+.checker textarea:focus{border-color:var(--action);outline:none;box-shadow:0 0 0 3px var(--action-soft)}
+.findings{margin-top:13px;display:flex;flex-direction:column;gap:8px}
+.finding{border-left:3px solid;border-radius:0 7px 7px 0;padding:10px 13px;font-size:12.5px;background:#F7F9FC}
+.finding.block{border-color:var(--risk);background:var(--risk-soft)}
+.finding.warn{border-color:var(--attention);background:var(--attention-soft)}
+.finding.clear{border-color:var(--ok);background:var(--ok-soft)}
+.finding .why{color:var(--muted);display:block;margin-top:2px;font-size:12px}
+.finding.block .why{color:#7A2B24}
+.finding.warn .why{color:#7C4A0C}
+.wordlist{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
+.word{font-size:12px;padding:3px 9px;border-radius:5px;background:var(--risk-soft);color:var(--risk);font-weight:600}
+.word.ctx{background:var(--attention-soft);color:var(--attention)}
+
+@media (max-width:1080px){.udetail{grid-template-columns:1fr}.uside{border-right:0;border-bottom:1px solid var(--line-soft)}
+  .split{grid-template-columns:1fr}}
+@media (max-width:760px){
+  .rail{position:fixed;transform:translateX(-100%);z-index:20;transition:transform .2s}
+  .rail.open{transform:none}
+  .page{padding:16px 14px 48px}.topbar{padding:11px 14px}
+  table{font-size:12.5px}th,td{padding:8px 12px}
+}
+</style>
+</head>
+<body>
+<div class="shell">
+
+<nav class="rail" id="rail" aria-label="後台導覽">
+  <div class="brand">
+    <div class="brand-mark">
+      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
+        <path d="M12 2 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6z"/>
+      </svg>
+    </div>
+    <div>
+      <div class="brand-name">MotoVerify</div>
+      <div class="brand-sub">營運後台</div>
+    </div>
+  </div>
+
+  <div class="nav-group">
+    <h3>總覽</h3>
+    <button class="nav-item" data-page="overview" aria-current="page"><span class="nav-label">營運總覽</span></button>
+  </div>
+
+  <div class="nav-group">
+    <h3>個人用戶</h3>
+    <button class="nav-item" data-page="users"><span class="nav-label">使用者名冊</span></button>
+    <button class="nav-item" data-page="behaviour"><span class="nav-label">行為與興趣</span></button>
+    <button class="nav-item" data-page="garage"><span class="nav-label">車庫與履歷</span></button>
+  </div>
+
+  <div class="nav-group">
+    <h3>App 功能管理</h3>
+    <button class="nav-item" data-page="verify"><span class="nav-label">檢驗任務</span><span class="nav-count" data-metric="verify.pending"></span></button>
+    <button class="nav-item" data-page="reports"><span class="nav-label">檢驗報告</span></button>
+    <button class="nav-item" data-page="market"><span class="nav-label">交易市場</span><span class="nav-count" data-metric="market.pending"></span></button>
+    <button class="nav-item" data-page="messages"><span class="nav-label">訊息與檢舉</span><span class="nav-count" data-metric="messages.reports"></span></button>
+    <button class="nav-item" data-page="discussion"><span class="nav-label">討論中心</span><span class="nav-count" data-metric="discussion.reports"></span></button>
+    <button class="nav-item" data-page="news"><span class="nav-label">車訊新知</span></button>
+    <button class="nav-item" data-page="probe"><span class="nav-label">Probe 裝置</span></button>
+  </div>
+
+  <div class="nav-group">
+    <h3>主資料與內容</h3>
+    <button class="nav-item" data-page="models"><span class="nav-label">車款主檔</span></button>
+    <button class="nav-item" data-page="push"><span class="nav-label">推播與提醒</span></button>
+  </div>
+
+  <div class="nav-group">
+    <h3>法遵</h3>
+    <button class="nav-item" data-page="copy"><span class="nav-label">文案守則檢查</span></button>
+    <button class="nav-item" data-page="consent"><span class="nav-label">個資同意管理</span></button>
+  </div>
+
+  <div class="nav-group">
+    <h3>環境</h3>
+    <button class="nav-item" data-page="demo"><span class="nav-label">環境旗標</span></button>
+  </div>
+</nav>
+
+<div class="main">
+  <header class="topbar">
+    <div>
+      <h1 id="pageTitle">營運總覽</h1>
+      <div class="crumb" id="pageCrumb">尚未連接資料來源</div>
+    </div>
+    <div class="topbar-spacer"></div>
+    <div class="op">值班：<b data-field="admin.displayName">—</b>　平台管理員</div>
+  </header>
+
+<!-- ================= OVERVIEW ================= -->
+<section class="page" id="page-overview">
+  <dl class="strip">
+    <div><dt>註冊用戶</dt><dd data-metric="users.total">—</dd><div class="note">本月新增</div></div>
+    <div><dt>月活躍用戶</dt><dd data-metric="users.mau">—</dd><div class="note">佔註冊比例</div></div>
+    <div><dt>登記車輛</dt><dd data-metric="vehicles.total">—</dd><div class="note">平均每人台數</div></div>
+    <div><dt>在架刊登</dt><dd data-metric="listings.active">—</dd><div class="note">待審筆數</div></div>
+    <div><dt>本月檢驗</dt><dd data-metric="verifications.month">—</dd><div class="note">待覆核筆數</div></div>
+  </dl>
+
+  <div class="panel">
+    <div class="panel-head"><h2>今天要處理的事</h2><span class="sub">依風險排序，不依時間排序</span></div>
+    <div class="panel-body flush">
+      <table data-collection="tasks">
+        <thead><tr><th>事項</th><th>數量</th><th>最久等待</th><th>風險</th><th></th></tr></thead>
+        <tbody><tr><td class="empty-cell" colspan="5">尚無資料</td></tr></tbody>
+      </table>
+    </div>
+  </div>
+
+  <div class="split">
+    <div class="panel">
+      <div class="panel-head"><h2>用戶都在用哪些畫面</h2><span class="datasrc">需先埋事件</span></div>
+      <div class="panel-body">
+        <div class="heat" data-metric="events.pageShare">
+          <div class="heatrow"><span class="lbl">首頁</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+          <div class="heatrow"><span class="lbl">市場</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+          <div class="heatrow"><span class="lbl">檢驗</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+          <div class="heatrow"><span class="lbl">訊息</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+          <div class="heatrow"><span class="lbl">討論中心</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+          <div class="heatrow"><span class="lbl">Probe</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
+        </div>
+        <div class="stack-note" style="margin-top:14px">
+          檢驗是產品的核心差異化，這條數字要跟其他畫面對照著看。
+          若佔比明顯偏低，通常代表入口設計有問題而不是使用者不需要。
+        </div>
+      </div>
+    </div>
+
+    <div class="panel">
+      <div class="panel-head"><h2>用戶組成</h2></div>
+      <div class="panel-body flush">
+        <table data-collection="users">
+          <tbody>
+            <tr><td>使用模式為賣家</td><td class="num" data-metric="users.sellers">—</td><td><div class="bar"><i style="width:0"></i></div></td></tr>
+            <tr><td>使用模式為買家</td><td class="num" data-metric="users.buyers">—</td><td><div class="bar"><i style="width:0"></i></div></td></tr>
+            <tr><td>已登記至少一台車</td><td class="num" data-metric="users.withVehicle">—</td><td class="dim">—</td></tr>
+            <tr><td>有在售刊登</td><td class="num" data-metric="users.withListing">—</td><td class="dim">—</td></tr>
+            <tr><td>已綁定 Probe</td><td class="num" data-metric="users.withProbe">—</td><td class="dim">—</td></tr>
+            <tr><td>7 日未開啟</td><td class="num" data-metric="users.dormant7d">—</td><td class="dim">—</td></tr>
+          </tbody>
+        </table>
+      </div>
+    </div>
+  </div>
+</section>
+
+<!-- ================= USERS ================= -->
+<section class="page" id="page-users" hidden>
+  <p class="page-intro">
+    個人用戶名冊，點任一列進入使用者詳情。代號由使用者自行命名、全平台唯一，類似 Instagram 的帳號名稱——
+    客服用代號查最快，但代號可以被改掉，帳號的實際識別仍須以內部 id 為準，只是那個 id 不需要顯示在這個畫面上。
+  </p>
+
+  <div class="panel">
+    <div class="panel-head">
+      <h2>使用者</h2><span class="sub" data-metric="users.total">—</span>
+      <div class="spacer"></div>
+      <input class="search" type="search" placeholder="搜尋暱稱、代號或 email" aria-label="搜尋使用者">
+      <div class="filters">
+        <button class="chip" aria-pressed="true">全部</button>
+        <button class="chip" aria-pressed="false">近 7 日活躍</button>
+        <button class="chip" aria-pressed="false">有在售</button>
+        <button class="chip" aria-pressed="false">未登記車輛</button>
+      </div>
+    </div>
+    <div class="panel-body flush" style="overflow-x:auto">
+      <table data-collection="users">
+        <thead>
+          <tr>
+            <th>暱稱</th><th>代號</th><th>模式</th>
+            <th>登記車款</th><th>在售</th><th>最常使用</th><th>最有興趣車款</th><th>最後活動</th>
+          </tr>
+        </thead>
+        <tbody><tr><td class="empty-cell" colspan="8">尚無資料</td></tr></tbody>
+      </table>
+    </div>
+  </div>
+
+  <div class="guard amber">
+    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
+      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
+    </svg>
+    <div>
+      <h4>「最常使用」與「最有興趣車款」目前沒有資料來源</h4>
+      <p>
+        app 尚未埋任何事件追蹤，這兩欄無法計算。需要先加
+        <code>page_view</code>（畫面停留）與 <code>listing_view</code>（刊登瀏覽、收藏、聯繫）兩類事件。
+        「最有興趣車款」建議用近 30 天瀏覽次數加權收藏行為推導，資料不足時顯示「資料不足」而不是猜一個。
+      </p>
+    </div>
+  </div>
+
+  <div class="guard amber">
+    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
+      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
+    </svg>
+    <div>
+      <h4>代號唯一性需要額外的資料結構</h4>
+      <p>
+        Firestore 沒有 unique constraint。自訂代號要另開一個 <code>handles/{hand
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit ab67ab6

---

### Update backstage_admin_v0.1 `67c7570`

- 使用者：Archi
- 時間：2026-09-02 17:47
- 分類：系統
- 類型：其他

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/backstage_admin_v0.1 b/backstage_admin_v0.1
index 0c0d211..7bb5a3b 100644
--- a/backstage_admin_v0.1
+++ b/backstage_admin_v0.1
@@ -1,7 +1,7 @@
 <!DOCTYPE html>
-<html lang="zh-Hant">
-<head>
-<meta charset="utf-8">
+<!-- saved from url=(0051)file:///Users/archi/Downloads/motoverify-admin.html -->
+<html lang="zh-Hant"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
+
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <title>MotoVerify 營運後台</title>
 <!--
@@ -214,7 +214,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
   <div class="brand">
     <div class="brand-mark">
       <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
-        <path d="M12 2 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6z"/>
+        <path d="M12 2 4 5.5v6c0 5 3.4 9.2 8 10.5 4.6-1.3 8-5.5 8-10.5v-6z"></path>
       </svg>
     </div>
     <div>
@@ -225,7 +225,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 
   <div class="nav-group">
     <h3>總覽</h3>
-    <button class="nav-item" data-page="overview" aria-current="page"><span class="nav-label">營運總覽</span></button>
+    <button class="nav-item" data-page="overview"><span class="nav-label">營運總覽</span></button>
   </div>
 
   <div class="nav-group">
@@ -254,7 +254,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 
   <div class="nav-group">
     <h3>法遵</h3>
-    <button class="nav-item" data-page="copy"><span class="nav-label">文案守則檢查</span></button>
+    <button class="nav-item" data-page="copy" aria-current="page"><span class="nav-label">文案守則檢查</span></button>
     <button class="nav-item" data-page="consent"><span class="nav-label">個資同意管理</span></button>
   </div>
 
@@ -267,15 +267,15 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 <div class="main">
   <header class="topbar">
     <div>
-      <h1 id="pageTitle">營運總覽</h1>
-      <div class="crumb" id="pageCrumb">尚未連接資料來源</div>
+      <h1 id="pageTitle">文案守則檢查</h1>
+      <div class="crumb" id="pageCrumb">提案功能五 責任邊界</div>
     </div>
     <div class="topbar-spacer"></div>
     <div class="op">值班：<b data-field="admin.displayName">—</b>　平台管理員</div>
   </header>
 
 <!-- ================= OVERVIEW ================= -->
-<section class="page" id="page-overview">
+<section class="page" id="page-overview" hidden="">
   <dl class="strip">
     <div><dt>註冊用戶</dt><dd data-metric="users.total">—</dd><div class="note">本月新增</div></div>
     <div><dt>月活躍用戶</dt><dd data-metric="users.mau">—</dd><div class="note">佔註冊比例</div></div>
@@ -296,7 +296,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 
   <div class="split">
     <div class="panel">
-      <div class="panel-head"><h2>用戶都在用哪些畫面</h2><span class="datasrc">需先埋事件</span></div>
+      <div class="panel-head"><h2>用戶都在用哪些畫面</h2></div>
       <div class="panel-body">
         <div class="heat" data-metric="events.pageShare">
           <div class="heatrow"><span class="lbl">首頁</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
@@ -332,7 +332,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= USERS ================= -->
-<section class="page" id="page-users" hidden>
+<section class="page" id="page-users" hidden="">
   <p class="page-intro">
     個人用戶名冊，點任一列進入使用者詳情。代號由使用者自行命名、全平台唯一，類似 Instagram 的帳號名稱——
     客服用代號查最快，但代號可以被改掉，帳號的實際識別仍須以內部 id 為準，只是那個 id 不需要顯示在這個畫面上。
@@ -363,44 +363,20 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
     </div>
   </div>
 
-  <div class="guard amber">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>「最常使用」與「最有興趣車款」目前沒有資料來源</h4>
-      <p>
-        app 尚未埋任何事件追蹤，這兩欄無法計算。需要先加
-        <code>page_view</code>（畫面停留）與 <code>listing_view</code>（刊登瀏覽、收藏、聯繫）兩類事件。
-        「最有興趣車款」建議用近 30 天瀏覽次數加權收藏行為推導，資料不足時顯示「資料不足」而不是猜一個。
-      </p>
-    </div>
-  </div>
+  
 
-  <div class="guard amber">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>代號唯一性需要額外的資料結構</h4>
-      <p>
-        Firestore 沒有 unique constraint。自訂代號要另開一個 <code>handles/{handle}</code> collection 當索引，
-        用 transaction 搶佔，rules 限制只能建立不能覆寫。同時需要保留代號變更紀錄，
-        否則爭議發生後對方改掉代號就查不到了。
-      </p>
-    </div>
-  </div>
+  
 </section>
 
 <!-- ================= USER DETAIL ================= -->
-<section class="page" id="page-userdetail" hidden>
+<section class="page" id="page-userdetail" hidden="">
   <div class="panel">
     <div class="panel-head">
       <h2>使用者詳情</h2>
       <div class="spacer"></div>
       <button class="btn sm" data-goto="users">回名冊</button>
-      <button class="btn sm" disabled>寄送通知</button>
-      <button class="btn sm danger" disabled>停權</button>
+      <button class="btn sm" disabled="">寄送通知</button>
+      <button class="btn sm danger" disabled="">停權</button>
     </div>
     <div class="udetail">
       <div class="uside">
@@ -469,21 +445,8 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= BEHAVIOUR ================= -->
-<section class="page" id="page-behaviour" hidden>
-  <div class="guard amber">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>這一頁的所有數字都需要先埋事件</h4>
-      <p>
-        建議的最小事件集：<code>page_view</code>、<code>listing_view</code>、<code>listing_favorite</code>、
-        <code>listing_contact</code>、<code>verification_start</code>、<code>verification_complete</code>。
-        六個事件就能撐起這整頁，也是功能九「真實使用數據」的資料基礎。
-        另外 Firestore 不支援 group by，排行與留存需由 Cloud Functions 定期聚合寫入 <code>stats/</code>。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-behaviour" hidden="">
+  
 
   <div class="split">
     <div class="panel">
@@ -497,7 +460,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
     </div>
 
     <div class="panel">
-      <div class="panel-head"><h2>興趣與定位是否一致</h2><span class="ref">提案 §5</span></div>
+      <div class="panel-head"><h2>興趣與定位是否一致</h2></div>
       <div class="panel-body">
         <div class="heat" data-metric="stats.priceBand">
           <div class="heatrow"><span class="lbl">十萬以上</span><div class="bar"><i style="width:0"></i></div><span class="val">—</span></div>
@@ -527,7 +490,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= GARAGE ================= -->
-<section class="page" id="page-garage" hidden>
+<section class="page" id="page-garage" hidden="">
   <p class="page-intro">
     對應 app 首頁的「我的車輛」與車輛詳情頁。這裡管的是登記車輛本身、行照核對、里程異常與保養提醒。
   </p>
@@ -550,7 +513,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
   </div>
 
   <div class="panel">
-    <div class="panel-head"><h2>行照處理原則</h2><span class="ref">提案 功能三・R3</span></div>
+    <div class="panel-head"><h2>行照處理原則</h2></div>
     <div class="panel-body">
       <div class="stack-note">
         行照僅用於驗證<b>車輛存在性</b>，不用於比對姓名。中古車在車行手上時多半尚未過戶，
@@ -562,20 +525,8 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= VERIFY ================= -->
-<section class="page" id="page-verify" hidden>
-  <div class="guard">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>這個畫面沒有「判定」功能，而且不應該被加上</h4>
-      <p>
-        依提案功能五，模型只輸出 attention、不輸出 verdict。覆核人員能做的是
-        <code>確認標記</code>、<code>移除誤判</code>、<code>退回重拍</code>——沒有合格與不合格。
-        一旦後台出現判定按鈕，平台就從「提供初步篩選」變成「提供鑑定結果」。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-verify" hidden="">
+  
 
   <dl class="strip">
     <div><dt>本月檢驗</dt><dd data-metric="verifications.month">—</dd><div class="note">賣家驗證／買家複驗</div></div>
@@ -587,7 +538,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 
   <div class="panel">
     <div class="panel-head">
-      <h2>覆核佇列</h2><span class="ref app">app 檢驗頁</span>
+      <h2>覆核佇列</h2>
       <div class="spacer"></div>
       <div class="filters">
         <button class="chip" aria-pressed="true">全部</button>
@@ -623,21 +574,8 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= REPORTS ================= -->
-<section class="page" id="page-reports" hidden>
-  <div class="guard">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>目前的報告頁與提案功能五直接衝突</h4>
-      <p>
-        app 的檢驗報告顯示「檢驗總評分」。提案功能五明訂
-        「對外顯示分項燈號（良好／注意／需確認），<b>不顯示總分</b>」，
-        理由是總分等同對外給出綜合判定。這兩件事不能同時成立，
-        必須擇一——這是<b>產品決策不是設定值</b>，建議在簡報前定案。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-reports" hidden="">
+  
 
   <div class="panel">
     <div class="panel-head"><h2>分項燈號分布</h2><span class="sub">本月報告</span></div>
@@ -661,7 +599,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= MARKET ================= -->
-<section class="page" id="page-market" hidden>
+<section class="page" id="page-market" hidden="">
   <p class="page-intro">
     對應 app 的交易市場頁。刊登審核只檢查必填欄位與必拍角度是否完成，車況本身不在這裡判斷，
     平台也不背書。
@@ -695,20 +633,8 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= MESSAGES ================= -->
-<section class="page" id="page-messages" hidden>
-  <div class="guard">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>管理員不能瀏覽未經檢舉的對話</h4>
-      <p>
-        私訊內容只在使用者主動檢舉後才開放調閱，且僅顯示被檢舉的訊息前後各三則，調閱行為要留稽核紀錄。
-        Firestore rules 不應給 admin 直接讀 <code>conversations/{id}/messages</code> 的權限，
-        調閱要走 Cloud Function 驗證檢舉存在後才回傳。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-messages" hidden="">
+  
 
   <dl class="strip">
     <div><dt>總對話數</dt><dd data-metric="conversations.total">—</dd><div class="note">本月新增</div></div>
@@ -718,7 +644,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
   </dl>
 
   <div class="panel">
-    <div class="panel-head"><h2>檢舉待處理</h2><span class="ref app">app 訊息頁</span></div>
+    <div class="panel-head"><h2>檢舉待處理</h2></div>
     <div class="panel-body flush">
       <table data-collection="reports">
         <thead><tr><th>檢舉理由</th><th>檢舉人</th><th>被檢舉人</th><th>時間</th><th></th></tr></thead>
@@ -729,25 +655,14 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= DISCUSSION ================= -->
-<section class="page" id="page-discussion" hidden>
-  <div class="guard amber">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>測試貼文必須用環境旗標隔離</h4>
-      <p>
-        QA 用的同步測試貼文若寫進正式資料庫，一般使用者就看得到。
-        這類內容不該靠記得手動刪除，應在寫入時標記來源並由旗標控制顯示，見環境旗標頁。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-discussion" hidden="">
+  
 
   <div class="panel">
     <div class="panel-head">
-      <h2>貼文管理</h2><span class="ref app">app 討論中心</span>
+      <h2>貼文管理</h2>
       <div class="spacer"></div>
-      <button class="btn sm danger" disabled>批次刪除測試貼文</button>
+      <button class="btn sm danger" disabled="">批次刪除測試貼文</button>
     </div>
     <div class="panel-body flush">
       <table data-collection="posts">
@@ -789,17 +704,14 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= NEWS ================= -->
-<section class="page" id="page-news" hidden>
-  <p class="page-intro">
-    對應 app 首頁底部的「車訊新知」。提案功能九把內容型獲客列為第一年的核心，
-    所以這裡不只是 CMS，是獲客工具——每篇要能看到帶進多少人。
-  </p>
+<section class="page" id="page-news" hidden="">
+  <p class="page-intro"></p>
 
   <div class="panel">
     <div class="panel-head">
-      <h2>文章</h2><span class="ref app">app 首頁「車訊新知」</span>
+      <h2>文章</h2>
       <div class="spacer"></div>
-      <button class="btn sm primary" disabled>新增文章</button>
+      <button class="btn sm primary" disabled="">新增文章</button>
     </div>
     <div class="panel-body flush">
       <table data-collection="news">
@@ -809,28 +721,12 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
     </div>
   </div>
 
-  <div class="stack-note">
-    轉載他人內容需取得授權，否則只能寫摘要並連回原文。
-    提案功能九真正要的是用自己的資料產出別人沒有的內容——那種文章才有傳播性，也才是零成本獲客的來源。
-  </div>
+  
 </section>
 
 <!-- ================= PROBE ================= -->
-<section class="page" id="page-probe" hidden>
-  <div class="guard amber">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>MotoProbe 完全沒有出現在 v0.3 提案裡</h4>
-      <p>
-        app 已經有 <code>/probe</code> 的藍牙配對流程、Developer Mode 與 Mock Probe，
-        但提案的十大功能、財務模型、成本結構裡都沒有硬體這條線。
-        硬體會帶來庫存、保固、退換與 NCC 認證成本，與 §8.2「不碰貨」的原則有張力。
-        <b>簡報前必須決定它是產品的一部分還是實驗</b>，評審一定會問成本從哪裡來。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-probe" hidden="">
+  
 
   <dl class="strip">
     <div><dt>已綁定裝置</dt><dd data-metric="devices.total">—</dd><div class="note">佔用戶比例</div></div>
@@ -840,7 +736,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
   </dl>
 
   <div class="panel">
-    <div class="panel-head"><h2>裝置</h2><span class="ref new">提案未涵蓋</span></div>
+    <div class="panel-head"><h2>裝置</h2></div>
     <div class="panel-body flush">
       <table data-collection="devices">
         <thead><tr><th>裝置序號</th><th>綁定用戶</th><th>韌體</th><th>最後回報</th><th>電壓讀數</th><th>狀態</th></tr></thead>
@@ -849,35 +745,19 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
     </div>
   </div>
 
-  <div class="panel">
-    <div class="panel-head"><h2>Probe 設定</h2></div>
-    <div class="panel-body">
-      <div class="setting">
-        <div class="txt"><b>允許 Mock Probe</b><span>app 的 Developer Mode 開關。正式環境啟用會讓假讀數進入檢驗報告。</span></div>
-        <button class="tog warn" aria-pressed="false" aria-label="允許 Mock Probe"></button>
-      </div>
-      <div class="setting">
-        <div class="txt"><b>電壓讀數併入檢驗報告</b><span>影響報告的「電系狀況」分項。</span></div>
-        <button class="tog" aria-pressed="false" aria-label="電壓讀數併入報告"></button>
-      </div>
-      <div class="setting">
-        <div class="txt"><b>低電壓自動推播</b><span>讀數低於門檻時提醒車主，是留存工具。</span></div>
-        <button class="tog" aria-pressed="false" aria-label="低電壓自動推播"></button>
-      </div>
-    </div>
-  </div>
+  
 </section>
 
 <!-- ================= MODELS ================= -->
-<section class="page" id="page-models" hidden>
+<section class="page" id="page-models" hidden="">
   <p class="page-intro">
     車款主檔是提案功能一的本體，也是被形容為「最被低估的差異點」的東西。
     刊登強制從這裡選取，搜尋走 label 而非字串比對。
   </p>
 
   <div class="panel">
-    <div class="panel-head"><h2>同義詞映射</h2><span class="ref">提案 功能一</span>
-      <div class="spacer"></div><button class="btn sm primary" disabled>新增車款</button></div>
+    <div class="panel-head"><h2>同義詞映射</h2>
+      <div class="spacer"></div><button class="btn sm primary" disabled="">新增車款</button></div>
     <div class="panel-body flush">
       <table data-collection="models">
         <thead><tr><th>標準車款</th><th>廠牌 / 車系</th><th>已映射寫法</th><th>牌照</th><th>本月搜尋落空</th></tr></thead>
@@ -899,7 +779,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= PUSH ================= -->
-<section class="page" id="page-push" hidden>
+<section class="page" id="page-push" hidden="">
   <p class="page-intro">
     app 設定頁有「通知」項目。提案功能四指出真正驅動記錄行為的是到期提醒，
     所以推播不是行銷工具，是留存機制。
@@ -943,10 +823,10 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= COPY ================= -->
-<section class="page" id="page-copy" hidden>
+<section class="page" id="page-copy">
   <div class="guard">
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
+      <circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16.5v.01"></path>
     </svg>
     <div>
       <h4>文案是法律風險最容易外洩的地方</h4>
@@ -999,20 +879,8 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= CONSENT ================= -->
-<section class="page" id="page-consent" hidden>
-  <div class="guard">
-    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
-      <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>
-    </svg>
-    <div>
-      <h4>同意條款不能事後補</h4>
-      <p>
-        行照含姓名、地址、身分證字號後數碼。依提案功能八，同意必須在<b>上傳行照的當下</b>取得。
-        資料若在錯誤的同意基礎上收集，功能八與改裝精準行銷整批不可使用（風險 R4）。
-        下表按同意版本切分現有資料，是為了在需要時能夠精確排除。
-      </p>
-    </div>
-  </div>
+<section class="page" id="page-consent" hidden="">
+  
 
   <div class="panel">
     <div class="panel-head"><h2>同意版本與可用範圍</h2><span class="ref">提案 功能八</span></div>
@@ -1026,7 +894,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 
   <div class="split">
     <div class="panel">
-      <div class="panel-head"><h2>資料與隱私設定</h2><span class="ref app">app 設定頁</span></div>
+      <div class="panel-head"><h2>資料與隱私設定</h2></div>
       <div class="panel-body">
         <div class="setting">
           <div class="txt"><b>允許用戶匯出自己的資料</b><span>個資法上的查閱與複製權。app 設定頁應提供入口。</span></div>
@@ -1057,7 +925,7 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
 </section>
 
 <!-- ================= ENV FLAGS ================= -->
-<section class="page" id="page-demo" hidden>
+<section class="page" id="page-demo" hidden="">
   <p class="page-intro">
     示範資料與開發工具應由旗標控制，而不是靠記得手動刪除。簡報前用這一頁一次關閉。
   </p>
@@ -1229,5 +1097,6 @@ td.empty-cell{text-align:center;color:var(--faint);padding:30px 17px;font-size:1
   input.addEventListener("input", check);
 })();
 </script>
-</body>
-</html>
+
+
+</body></html>
```

</details>

#### 結果
已提交 commit 67c7570

---

## 2026年9月3日 週四

### 資料標籤與處理討論

- 使用者：li220fish
- 時間：2026-09-03
- 分類：系統
- 類型：討論

#### 摘要
1.【前台】電車的資料如何處理（油耗等）
2.【前台】市場可篩選的內容
3.【前台】車子的標籤（越野車、電車等）
8.【前台】車子資訊的文章格式
4.【後台】今天要處理的事，如何去設定（人工排查、程式自動偵測）
5.【後台】需要處理的車輛，需定義系統要檢查什麼內容
6.【後台】交易市場，需定義系統要檢查什麼內容
7.【後台】車款主檔的同義詞界定
9.【檢驗】各項目的檢驗標準與方法

#### 結果
實作中，需求尚未完成（結案：2026-09-03）

#### 時數
6

---

### 測試可持續測量電壓之電表（帶有藍芽功能）

- 使用者：jefferylu33
- 時間：2026-09-03
- 分類：檢定辨識
- 類型：測試

#### 摘要
測試硬體

#### 結果
實作中，需求尚未完成

#### 時數
0

---

## 2026年9月4日 週五

### 後台功能上版

- 使用者：li220fish
- 時間：2026-09-04
- 分類：後台
- 類型：開發

#### 摘要
將 html 轉換成 vue 後推上 firebase

#### 結果
驗證完成，功能確定上線（結案：2026-09-04）

#### 時數
0.5

---

### 資料庫修正

- 使用者：li220fish
- 時間：2026-09-04
- 分類：系統
- 類型：維護

#### 摘要
明確資料庫的設計

#### 結果
實作中，需求尚未完成（結案：2026-09-04）

#### 時數
7.5

---

### APP 測試

- 使用者：jefferylu33
- 時間：2026-09-04
- 分類：前台
- 類型：測試

#### 摘要
第三版 APP 功能驗證

#### 結果
驗證完成，功能確定上線（結案：2026-09-04）

#### 時數
0.5

---

## 2026年9月5日 週六

### APP 操作流程測試（實際驗車）

- 使用者：Archi
- 時間：2026-09-05
- 分類：檢定辨識
- 類型：測試

#### 摘要
實際使用 APP 進行測試

#### 結果
驗證完成，功能確定上線（結案：2026-09-05）

#### 時數
3

---

### APP 優化討論

- 使用者：Archi
- 時間：2026-09-05
- 分類：前台
- 類型：開發

#### 摘要
反饋測驗問題

#### 結果
驗證完成，功能確定上線（結案：2026-09-05）

#### 時數
3

---

### IOS APP 燒錄

- 使用者：Archi
- 時間：2026-09-05
- 分類：系統
- 類型：開發

#### 摘要
使用 mac 進行 APP 燒錄

#### 結果
驗證完成，功能確定上線（結案：2026-09-05）

#### 時數
6

---

### firebase 結構更新、AI驗車功能串接 `12afceb`

- 使用者：li220fish
- 時間：2026-09-05 22:33
- 分類：系統
- 類型：功能

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/.gitignore b/.gitignore
index 7453813..437578f 100644
--- a/.gitignore
+++ b/.gitignore
@@ -20,6 +20,9 @@ dist-ssr
 firebase-debug.log
 .firebase/
 
+# Firestore migration backups — local dumps of real data, never commit
+backup/firestore-before-v1/
+
 # Playwright
 test-results/
 playwright-report/
diff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml
index d62930a..0085fcc 100644
--- a/android/app/src/main/AndroidManifest.xml
+++ b/android/app/src/main/AndroidManifest.xml
@@ -39,4 +39,25 @@
 
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.RECORD_AUDIO" />
+    <!-- Step 3 / Step 39 (Environment/Cold-State capture) use getUserMedia()
+         video+audio via the WebView (video-recorder.service.ts) — Capacitor's
+         BridgeWebChromeClient already handles the runtime permission prompt
+         for this (onPermissionRequest), it just needs CAMERA declared here
+         to be grantable at all. -->
+    <uses-permission android:name="android.permission.CAMERA" />
+    <!-- BridgeWebChromeClient.onPermissionRequest() requests CAMERA +
+         RECORD_AUDIO + MODIFY_AUDIO_SETTINGS together as one all-or-nothing
+         batch for any getUserMedia() call that includes audio (see
+         node_modules/@capacitor/android's BridgeWebChromeClient.java). Since
+         MODIFY_AUDIO_SETTINGS wasn't declared here, Android could never
+         report it granted, so the combined check always failed and denied
+         the WHOLE request — including camera — even though CAMERA and
+         RECORD_AUDIO were both actually granted. Reproduced live on-device
+         (getUserMedia rejected with NotAllowedError: Permission denied
+         despite CAMERA/RECORD_AUDIO showing granted=true via `adb shell
+         dumpsys package`) before adding this. MODIFY_AUDIO_SETTINGS is a
+         normal (not dangerous) permission — declaring it is enough, no
+         runtime prompt needed for it specifically. -->
+    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
+    <uses-feature android:name="android.hardware.camera" android:required="false" />
 </manifest>
diff --git a/docs/admin-backend.md b/docs/admin-backend.md
new file mode 100644
index 0000000..3880933
--- /dev/null
+++ b/docs/admin-backend.md
@@ -0,0 +1,108 @@
+# MotoVerify 營運後台 (/admin)
+
+A desktop-first internal ops tool, deliberately separate from the mobile
+app's views/components/design tokens (`src/admin/`, own stylesheet, own
+layout — no `AppHeader`/`BottomNavigation`). Built from a reference mockup
+provided 2026-09-03. Wired to the same live Firebase project (client SDK
+only, same as the rest of this app — no Admin SDK / service account key).
+
+## Access
+
+- URL: `/admin` (redirects to `/admin/login` if not signed in as the admin).
+- Login form accepts the literal **`test` / `test`** — this is exchanged
+  behind the scenes for a real seeded Firebase Auth account
+  (`src/admin/services/admin-auth.service.ts`), so Firestore's security
+  rules still see a genuine authenticated session instead of a fake
+  client-only flag.
+- Real account: `admin@test.com` / `test1234` (uid `CMWrmo2pHsRiBu5kMj1CDJ23xd72`),
+  one of the 5 fixed accounts created by `scripts/seed-test-users.mjs`
+  (`ALLOW_TEST_SEED=true node scripts/seed-test-users.mjs` to (re)create all
+  5 — idempotent). See [docs/test-accounts.md](test-accounts.md).
+  (Superseded 2026-09-04 — previously `admin@motoverify.internal` via the
+  now-deleted `scripts/seed-admin-user.mjs`.)
+- Signing into `/admin` uses the same shared Firebase Auth session as the
+  mobile app (one Firebase App instance) — it will sign the browser tab out
+  of any regular MotoVerify account that happened to be logged in there.
+  Open `/admin` in its own browser/profile if you need both at once.
+
+## Authorization model
+
+- `firestore.rules` hardcodes the admin's uid in an `isAdmin()` check rather
+  than a client-writable `admins/{uid}` allowlist collection — any rule
+  permissive enough to let a client write such an allowlist would let any
+  signed-in user self-grant admin and read every private conversation and
+  moderation report. Changing who is an admin means editing that uid in
+  `firestore.rules` and redeploying — there is no in-app "add an admin" flow.
+- Most collections the app already leaves open to any signed-in user
+  (`vehicles`, `verifications`, `marketplaceListings`, `vehicleNews`,
+  `users/{uid}`, `discussionPosts` + `comments`) needed no rule changes.
+  `conversations` (+ `messages`) and `discussionReports` were member/creator
+  -scoped, so `isAdmin()` was added as a bypass on read (and on
+  `discussionReports` update, to resolve reports) only — write access to
+  conversations/messages is unchanged.
+
+## New Firestore collections/fields (this is the "what would need to be
+added" report)
+
+| Collection / field | Written by | Purpose |
+|---|---|---|
+| `users/{uid}` — now actually populated | `src/services/firebase/user-profile.service.ts`, called from `auth.store.ts` on every auth-state resolution and on display-name change | **The foundational fix.** Firebase Auth has no client-listable "all users" API (only the Admin SDK, which this project deliberately doesn't use) — the admin's entire user roster reads this mirror instead. Only accounts that have signed in **since this change shipped** appear; older sessions self-heal on next login. |
+| `vehicleModels/{id}` | 車款主檔 section (list/add/delete) | New collection for a standardized brand/series list. The mobile app's vehicle/listing forms still take free-text brand/model — this collection doesn't constrain or validate them yet. To "do something" it would need those forms to select from this list instead of free text. |
+
+The reference mockup's 文案合規檢查 (copy compliance checker), 同意書與授權管理
+(consent/authorization), 環境旗標 (env flags), and 推播與提醒 (push/notification
+toggles) pages were all removed on request (2026-09-03) — along with the
+`adminSettings` collection entirely (its `notifications`/`privacy`/`envFlags`
+docs and its rule), the unused `disclaimers`/`consents` collections and
+rules, and the corresponding nav entries. Nothing else depended on any of
+them.
+
+## Known gaps (real data doesn't exist for these — shown as empty/"—" with an
+explanation in the UI, not fabricated)
+
+1. **No event tracking anywhere in the app.** Every "page visit heatmap",
+   "interest funnel", "drop-off by step", "retention cohort" panel in the
+   reference mockup needs a record of what a user viewed/clicked and when.
+   This app has zero instrumentation for that today — none of the mobile
+   views write to an `events` collection. Overview's "使用者最常出現在哪個
+   功能", Behaviour's whole page, and Verify's funnel/drop-off metric are all
+   real UI wired to real (empty) queries, honestly reporting "no data" rather
+   than inventing numbers.
+2. **Retention needs a login-history collection.** `users/{uid}.lastSeenAt`
+   only keeps the *most recent* sign-in — there's no per-login timestamp log,
+   so "次日/7天/30天留存" can't be reconstructed even approximately.
+3. **Probe telemetry is entirely unwired.** `voltageSessionService.start()` /
+   `.finish()` exist and are exported, but **nothing in the app calls them**
+   — the actual Bluetooth/mock probe measurement flow (`probe.store.ts`)
+   never persists a session summary to Firestore. The `voltageSessions`
+   collection is always empty in practice today, and there's no device-pairing
+   registry at all (no serial-number ↔ user mapping), so "配對成功率"
+   and "裝置序號" have no possible data source until that's built.
+4. **No listing status field.** `marketplaceListings` has no
+   active/pending/sold state, so "待審" / "已下架" / "平均上架天數" can't be
+   computed — the Market page shows the full list rather than a filtered
+   queue.
+5. **No per-category verification quality breakdown.** The 檢驗報告品質 page
+   shows real completed/needs-review/expired counts by verification type,
+   but not the reference's finer "electrical/body/engine pass-attention-fail"
+   split — that needs parsing every verification's `answers`/`evidence`
+   subcollections against a category taxonomy, which is a nontrivial
+   aggregation better done once at verification-completion time (writing a
+   summary field onto the `verifications` doc) than recomputed live in the
+   admin UI on every page load.
+6. **Reply-rate, EV flag, odometer-anomaly are heuristics, not real fields.**
+   "賣家回覆率" isn't computed at all (would need per-message analysis across
+   every conversation). "疑似電動車" is a brand-name string match, not a real
+   fuel-type field on `Vehicle`. "里程異常" is real — it compares a vehicle's
+   own verification history for a mileage that decreased over time — but it's
+   inferred, not a stored flag.
+
+## Files
+
+- `src/admin/` — all admin-only Vue components, services, and `admin.css`.
+- `src/services/firebase/user-profile.service.ts` — shared with the mobile
+  app (called from `auth.store.ts`); this is the one piece of "real app"
+  code this task touched outside `src/admin/`.
+- `scripts/seed-test-users.mjs` — creates/reuses the admin account (and the
+  4 other fixed test accounts alongside it).
+- `firestore.rules` — `isAdmin()` + the new collections' rules.
diff --git a/docs/firestore-v1-audit-report.md b/docs/firestore-v1-audit-report.md
new file mode 100644
index 0000000..47e6271
--- /dev/null
+++ b/docs/firestore-v1-audit-report.md
@@ -0,0 +1,555 @@
+# MotoVerify Firestore v1.0 Audit
+
+**Audit Date:** 2026-09-04
+**Firebase Project:** `motorcycle-verification` (project number `232449828934`) — the **only** Firebase project this app is configured against. There is no separate dev/staging project; `.firebaserc`'s only alias (`default`) and the app's own `.env` (`VITE_FIREBASE_PROJECT_ID=motorcycle-verification`) point at the same live project this audit inspected.
+**Firebase CLI Account:** `li220fish@gmail.com`
+**Functions region:** N/A — no `functions/` directory, no `firebase-functions`/`firebase-admin` dependency anywhere in the repo. This project is 100% Firebase client-SDK.
+**Firestore database:** `(default)`
+**Storage bucket:** `motorcycle-verification.firebasestorage.app`
+**Auditor:** Claude (automated audit — 6 parallel code/rules research agents, one direct read-only production Firestore inventory, and 25 dynamic security-rule tests executed against the real `firestore.rules` inside a local Firebase Emulator, fully isolated from production)
+
+## Executive Summary
+
+| | Count |
+|---|---|
+| PASS | 88 |
+| WARNING | 27 |
+| FAIL | 18 |
+| **CRITICAL** | **2** |
+
+**Overall: NOT READY**
+
+This app went through a real, disciplined Firestore v1.0 migration (`docs/firestore-v1-implementation-report.md`) that already discloses most of the gaps below — this audit independently re-verified them against live rules, live data, and real code rather than trusting that report's prose. The security **fundamentals** are genuinely solid: default-deny works, vehicle/verification privacy boundaries hold up under live dynamic testing, public-verification enumeration is blocked, counters are tamper-resistant, ownership can't be forged by a client. But two live, reproducible security gaps and 18 functional/schema deviations from the target spec — several of them (Cloud Functions, `accountId` identity layer, `transactions`, `vehicleIdentities`, `dealConfirmation`) whole features that were deliberately scoped out — mean this is **not** a clean v1.0 freeze candidate as literally specified.
+
+The 2 CRITICAL findings are both live-exploitable, confirmed by actually running the operation (against production for reads, against an isolated local emulator running the real rules for the write/forge attempts):
+- **CRITICAL-01**: any conversation member can forge a `type:'system'` chat message with arbitrary text (e.g. a fake "seller confirmed payment" notice) — confirmed by reproducing it.
+- **CRITICAL-02**: verification evidence in Cloud Storage is readable/writable by **any signed-in user**, not just the vehicle owner/admin — Firestore-level privacy on a private verification does not extend to its evidence files.
+
+---
+
+## 1. Firebase Environment
+
+| Item | Value |
+|---|---|
+| Project ID | `motorcycle-verification` |
+| Project Alias | `default` (only alias in `.firebaserc`) |
+| CLI Account | `li220fish@gmail.com` |
+| Functions region | N/A (no Cloud Functions exist) |
+| Firestore database | `(default)` |
+| Storage bucket | `motorcycle-verification.firebasestorage.app` |
+
+**Confirmed: the project this audit inspected is the exact same project the app ships against** — `.env`'s `VITE_FIREBASE_PROJECT_ID` and `.firebaserc`'s default alias both resolve to `motorcycle-verification`. This audit read live production data directly (read-only), not an emulator snapshot, for every "live" figure quoted below.
+
+**WARNING — no environment separation.** There is no dev/staging Firebase project at all; "production" and "development" are the same live project. Live evidence: `users` contains 35 documents, but only 5 are the intentional fixed test accounts (`docs/test-accounts.md`) — the other 30 are throwaway accounts created by `tests/e2e/*.spec.ts` runs against this same live project (e.g. `regress-buyer-1788517094729@example.com`, created the same day as this audit). The Playwright regression suite has no emulator target configured and creates real Firebase Auth users + Firestore docs in production on every run.
+
+---
+
+## 2. Collections Inventory (live, read-only, signed in as the seeded admin account)
+
+Read directly from production. No writes were performed against production at any point in this audit.
+
+| Collection | Docs | Notes |
+|---|---|---|
+| `users` | 35 | 5 intentional + 30 regression-test noise (see §1) |
+| `publicProfiles` | 5 | |
+| `accountIds` | *(list denied by design — `allow list: if false`)* | Per-doc `get()` on all 5 known ids succeeded and cross-checked correctly (§7) |
+| `vehicles` | 7 | Matches `docs/test-accounts.md`'s post-cleanup count exactly |
+| `verifications` | 7 | |
+| `marketplaceListings` | 2 | Matches docs |
+| `transactions` | *(unreadable — no rule permits read for anyone, including admin)* | Consistent with "feature doesn't exist" |
+| `vehicleModels` | 0 | |
+| `vehicleNews` | 3 | |
+| `discussionPosts` | **0** | **See §2a — contradicts documentation** |
+| `discussionReports` | 0 | |
+| `conversations` | 14 | |
+| `featuredDealers` | 4 | Deprecated collection, still live (§4) |
+| `voltageSessions`, `consents`, `disclaimers`, `adminSettings`, `userPreferences`, `myListings` | *(unreadable — no rule at all, not even for admin)* | Cannot be independently re-verified this session; see §8 limitations |
+
+Subcollections (`fuelLogs`, `maintenanceLogs`, `answers`, `evidence`, `appointments`, `comments`, `likes`, `favoriteListings`, `following`, `savedPosts`, `blockedUsers`, `messages`, `fuelReports`, `reviews`) could not be enumerated via an unfiltered `collectionGroup()` scan — Firestore's list-validator rejects a broad collection-group query when the underlying rule depends on a per-document ancestor lookup (`ownsVehicle(vehicleId)`, etc.), regardless of the admin branch. This is expected behavior (it's the same protection that blocks enumeration elsewhere), not a bug, but it means subcollection document counts in this report come from targeted per-parent reads and code-path analysis, not a single global count. See §8.
+
+### 2a. Documentation vs. live data mismatch — `discussionPosts`
+
+`docs/test-accounts.md` explicitly states, about the deleted legacy accounts: *"None of this was deleted"* and quotes 65+8+4=77 discussion posts still attributable to them. **Live production `discussionPosts` has 0 documents.** Two untracked files present at the very start of this audit session — `scripts/_scratch-audit-discussion.mjs` and `scripts/_scratch-clear-discussion.mjs` — strongly suggest a discussion-data clear operation was run at some point that the documentation was never updated to reflect. **Both files, and this audit's own temporary read-only inventory script, disappeared from disk during this audit session without this agent deleting them** — file timestamps show `scripts/delete-legacy-test-accounts.mjs` was also re-saved during this session. This is very likely a **separate, concurrent Claude Code session or process operating on this same repository at the same time**, not an action taken by this audit's own (explicitly read-only-instructed) subagents, none of which reported writing or deleting anything. **Flagging this to you directly: if you did not intend concurrent sessions to be touching this repo, verify what else may be running.** Practical effect on this report: `docs/test-accounts.md`'s discussion-content counts are stale and should not be trusted as current state.
+
+---
+
+## 3. Deprecated Collections
+
+| Collection | Firestore | Code Reference | Rules Reference | Result |
+|---|---|---|---|---|
+| `voltageSessions` | Unreadable (no rule); believed 0 per prior migration, **not independently re-verified this session** | **FOUND** — `src/services/firebase/voltage-session.service.ts` still exists; `src/admin/services/admin-data.service.ts:230` and `src/admin/sections/OverviewSection.vue:65,104` still query it live | Absent (correctly falls to default-deny) | **FAIL** — code wasn't fully removed even though data/rules were |
+| `userPreferences` | Unreadable; believed deleted | Dead references only (deletion-tooling comments) | Absent | PASS |
+| `myListings` | Unreadable; believed deleted | Dead references only | Absent | PASS |
+| `consents` | Unreadable | Comment only | Absent | PASS |
+| `disclaimers` | Unreadable | Comment only | Absent | PASS |
+| `adminSettings` | Unreadable | None found | Absent | PASS |
+| `featuredDealers` | **4 live docs**, actively read on the Home page | **Actively used** — `home-content.service.ts`, seed scripts | **Present**: `allow read, write: if signedIn();` — any signed-in user, not just admin, can overwrite it | **FAIL** — spec's §4 list explicitly says this collection should not exist in v1.0; kept as a disclosed, deliberate decision (real live feature, no replacement designed), but still a literal deviation, and the rule itself is the loose "any signed-in user" pattern §43 warns about (low impact: home-page dealer directory only, not core user data) |
+| `marketplaceListings/{id}/favorite` | N/A | Not referenced anywhere | Absent | PASS — sole favorite source is `users/{uid}/favoriteListings` (§25) |
+
+---
+
+## 4. Authentication / Users
+
+Live sample (`users/<regression-test-uid>`):
+```json
+{ "uid": "...", "displayName": null, "photoUrl": null, "updatedAt": "...", "email": "...", "createdAt": "...", "lastSeenAt": "...", "accountTier": "standard" }
+```
+
+| Field | Expected | Actual | Verdict |
+|---|---|---|---|
+| `accountId` | string | present only for the 5 fixed test accounts; absent (not even `null`) for all 30 other users | WARNING — by design, general `claimAccountId()` onboarding was never built (disclosed) |
+| `email`, `displayName`, `photoUrl`, `accountTier`, `lastSeenAt`, `createdAt` | required | present | PASS |
+| `region` | `string \| null` | present (`null`) only for the 5 fixed accounts; not written at all for ordinary sign-ups | WARNING |
+| `uid` (deprecated, doc ID already carries this) | must not exist | **present on every user doc** — `user-profile.service.ts:32` (`touchUserProfile` writes `uid` into the doc body on every sign-in) | **FAIL** |
+| `updatedAt` | not in target field list | present, written on every `touchUserProfile()` call | WARNING (harmless, undocumented) |
+| `currentRole`, `accountType`, `defaultRole` | must not exist | confirmed absent, both in code and in every live sample checked | PASS |
+
+---
+
+## 5. Business User-ID References (`
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 12afceb

---

## 2026年9月6日 週日

### Merge branch 'backstage' of https://github.com/Li220Fish/motorcycle-verification-platform into backstage `4fc83c0`

- 使用者：Archi
- 時間：2026-09-06 00:30
- 分類：系統
- 類型：合併

#### Prompt
在ＶＳＣＯＤＥ中要怎麼開起ＧＩＴ ＢＡＳＨ

#### 結果
已提交 commit 4fc83c0

#### 時數
0.1

---

### Merge branch 'develop' into backstage `db3ac3a`

- 使用者：Archi
- 時間：2026-09-06 00:37
- 分類：系統
- 類型：合併

#### Prompt
我想要我的termial 會有我目前在的分支像是windows的git bash 一樣

#### 結果
已提交 commit db3ac3a

#### 時數
0.1

---

### Firebase Auth 在 iOS WKWebView 卡在空白畫面的問題 `908e9df`

- 使用者：Archi
- 時間：2026-09-06 02:55
- 分類：系統
- 類型：修復

#### Prompt
如果我現在沒有env的設定內容，那我包好的ios app 會有用嗎？

#### 摘要
onAuthStateChanged 在 capacitor:// scheme 下有時因 indexedDB 卡住而永遠
不觸發回呼，導致 router guard 卡在 waitUntilReady()。改用 initializeAuth
明確指定 persistence 優先順序，indexedDB 失敗時能退回其他儲存方式。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/ios/App/CapApp-SPM/Package.swift b/ios/App/CapApp-SPM/Package.swift
index 56b4680..06cac7c 100644
--- a/ios/App/CapApp-SPM/Package.swift
+++ b/ios/App/CapApp-SPM/Package.swift
@@ -12,8 +12,8 @@ let package = Package(
     ],
     dependencies: [
         .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0"),
-        .package(name: "CapacitorCommunityBluetoothLe", path: "..\..\..\node_modules\@capacitor-community\bluetooth-le"),
-        .package(name: "CapacitorCamera", path: "..\..\..\node_modules\@capacitor\camera")
+        .package(name: "CapacitorCommunityBluetoothLe", path: "../../../node_modules/@capacitor-community/bluetooth-le"),
+        .package(name: "CapacitorCamera", path: "../../../node_modules/@capacitor/camera")
     ],
     targets: [
         .target(
diff --git a/src/services/firebase/firebase.ts b/src/services/firebase/firebase.ts
index bec9aaa..1a87f8a 100644
--- a/src/services/firebase/firebase.ts
+++ b/src/services/firebase/firebase.ts
@@ -1,5 +1,11 @@
 import { type FirebaseApp, initializeApp } from 'firebase/app'
-import { type Auth, getAuth } from 'firebase/auth'
+import {
+  type Auth,
+  browserLocalPersistence,
+  indexedDBLocalPersistence,
+  inMemoryPersistence,
+  initializeAuth,
+} from 'firebase/auth'
 import { type Firestore, getFirestore } from 'firebase/firestore'
 import { type Functions, getFunctions } from 'firebase/functions'
 import { type FirebaseStorage, getStorage } from 'firebase/storage'
@@ -15,7 +21,12 @@ const firebaseConfig = {
 
 export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig)
 
-export const auth: Auth = getAuth(firebaseApp)
+/** indexedDB hangs without erroring in some WKWebView/Capacitor contexts,
+ *  so onAuthStateChanged never fires — fall back through the persistence
+ *  chain instead of using the indexedDB-only default from getAuth(). */
+export const auth: Auth = initializeAuth(firebaseApp, {
+  persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
+})
 export const db: Firestore = getFirestore(firebaseApp)
 export const storage: FirebaseStorage = getStorage(firebaseApp)
 /** Trusted Backend (functions/) — Gemini Vision/Audio inspection, OCR
```

</details>

#### 結果
已提交 commit 908e9df

#### 時數
2.3

---

### APP 優化

- 使用者：Archi
- 時間：2026-09-06 ～ 2026-09-08
- 分類：前台
- 類型：開發

#### 摘要
深色模式、小數點、封面圖片上傳

#### 結果
需求已確定，等待實作（結案：2026-09-08）

#### 時數
3

---

## 2026年9月7日 週一

### 油耗功能測試

- 使用者：Archi
- 時間：2026-09-07
- 分類：前台
- 類型：測試

#### 摘要
油耗功能測試

#### 結果
需求已確定，等待實作（結案：2026-09-07）

#### 時數
2

---

### 優化驗車流程

- 使用者：Archi
- 時間：2026-09-07
- 分類：檢定辨識
- 類型：開發

#### 摘要
基本 13 項檢測及一覽表開發

#### 結果
實作中，需求尚未完成

#### 時數
3

---

### 檢測項目減少、驗證介面優化 `706fbf8`

- 使用者：li220fish
- 時間：2026-09-07 16:37
- 分類：系統
- 類型：功能

#### Prompt
現在他卡在啟動檢測，已授權麥克風但會卡在無法開始啟動檢測

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/android/app/capacitor.build.gradle b/android/app/capacitor.build.gradle
index a875002..15992ab 100644
--- a/android/app/capacitor.build.gradle
+++ b/android/app/capacitor.build.gradle
@@ -10,7 +10,10 @@ android {
 apply from: "../capacitor-cordova-android-plugins/cordova.variables.gradle"
 dependencies {
     implementation project(':capacitor-community-bluetooth-le')
+    implementation project(':capacitor-app')
     implementation project(':capacitor-camera')
+    implementation project(':capacitor-filesystem')
+    implementation project(':capacitor-preferences')
     implementation project(':capacitor-voice-recorder')
 
 }
diff --git a/android/capacitor.settings.gradle b/android/capacitor.settings.gradle
index 01078a6..0a1083d 100644
--- a/android/capacitor.settings.gradle
+++ b/android/capacitor.settings.gradle
@@ -5,8 +5,17 @@ project(':capacitor-android').projectDir = new File('../node_modules/@capacitor/
 include ':capacitor-community-bluetooth-le'
 project(':capacitor-community-bluetooth-le').projectDir = new File('../node_modules/@capacitor-community/bluetooth-le/android')
 
+include ':capacitor-app'
+project(':capacitor-app').projectDir = new File('../node_modules/@capacitor/app/android')
+
 include ':capacitor-camera'
 project(':capacitor-camera').projectDir = new File('../node_modules/@capacitor/camera/android')
 
+include ':capacitor-filesystem'
+project(':capacitor-filesystem').projectDir = new File('../node_modules/@capacitor/filesystem/android')
+
+include ':capacitor-preferences'
+project(':capacitor-preferences').projectDir = new File('../node_modules/@capacitor/preferences/android')
+
 include ':capacitor-voice-recorder'
 project(':capacitor-voice-recorder').projectDir = new File('../node_modules/capacitor-voice-recorder/android')
diff --git a/firestore.rules b/firestore.rules
index ef40998..e851e8b 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -142,16 +142,19 @@ service cloud.firestore {
         && (resource.data.userId == myUid() || ownsVehicle(resource.data.vehicleId) || isAdmin());
       // Admin bypass exists for scripts/seed-mock-vehicles.mjs, which
       // verifies several accounts' demo vehicles from one signed-in session.
-      // environmentContext (Step 3) / coldStateContext (Step 39) are
+      // environmentContext (Step 3) / coldStateContext (Step 39) /
+      // analysisStatus (Verification v2 — background AI status tracking) are
       // Trusted-Backend-only fields (Environment/Cold-State spec §40:
-      // "Client cannot set coldStateValid") — never legitimate in a
-      // client create payload.
+      // "Client cannot set coldStateValid"; same reasoning for
+      // analysisStatus — see AnalysisStatusEntry's own comment in
+      // types/verification.ts) — never legitimate in a client create payload.
       allow create: if signedIn()
         && ((request.resource.data.userId == myUid() && ownsVehicle(request.resource.data.vehicleId))
           || isAdmin())
         && request.resource.data.isPublic == false
         && !('environmentContext' in request.resource.data)
-        && !('coldStateContext' in request.resource.data);
+        && !('coldStateContext' in request.resource.data)
+        && !('analysisStatus' in request.resource.data);
       // Immutable the instant isPublic flips true — this single guard (only
       // updatable while still private) covers "no further edits to a
       // published report", "isPublic can only ever go false -> true, never
@@ -173,7 +176,8 @@ service cloud.firestore {
         && resource.data.get('isPublic', false) == false
         && (resource.data.userId == myUid() || ownsVehicle(resource.data.vehicleId) || isAdmin())
         && request.resource.data.get('environmentContext', null) == resource.data.get('environmentContext', null)
-        && request.resource.data.get('coldStateContext', null) == resource.data.get('coldStateContext', null);
+        && request.resource.data.get('coldStateContext', null) == resource.data.get('coldStateContext', null)
+        && request.resource.data.get('analysisStatus', null) == resource.data.get('analysisStatus', null);
       allow delete: if signedIn()
         && ((resource.data.get('isPublic', false) == false
             && (resource.data.userId == myUid() || ownsVehicle(resource.data.vehicleId)))
@@ -281,7 +285,7 @@ service cloud.firestore {
       allow create: if signedIn()
         && ((request.resource.data.sellerId == myUid() && request.resource.data.status == 'draft')
           || isAdmin());
-      // General edits (price/description/region/district/transferable/
+      // General edits (price/description/region/district/
       // availableDates/timeSlots/vehicleSnapshot.photos) — status/sellerId/
       // vehicleId/verificationIds/favoriteCount/appointmentCount stay fixed
       // through this path.
@@ -534,6 +538,16 @@ service cloud.firestore {
       allow write: if isAdmin();
     }
 
+    // Admin-editable Gemini prompt overrides (see
+    // functions/src/services/prompt-config.service.ts). Read-gated to admin
+    // only — unlike vehicleModels/vehicleNews this isn't reference content
+    // any signed-in user needs; the Trusted Backend reads it via Admin SDK,
+    // which bypasses these rules entirely, so this only governs the admin
+    // webapp's own client-SDK access.
+    match /aiPrompts/{document=**} {
+      allow read, write: if isAdmin();
+    }
+
     // Home page's Featured Dealers section — kept exactly as it was before
     // this migration (a live, working feature; the target spec's removal of
     // this collection was not applied — see docs/firestore-v1-implementation-report.md).
diff --git a/functions/src/ai/prompts/audio/engine-audio-global-v1.ts b/functions/src/ai/prompts/audio/engine-audio-global-v1.ts
deleted file mode 100644
index 17a9ad2..0000000
--- a/functions/src/ai/prompts/audio/engine-audio-global-v1.ts
+++ /dev/null
@@ -1,46 +0,0 @@
-export const ENGINE_AUDIO_GLOBAL_PROMPT_VERSION = 'engine-audio-global-v1'
-
-export const ENGINE_AUDIO_GLOBAL_PROMPT = `You are the MotoVerify motorcycle engine audio inspection engine.
-
-Your task is to analyze motorcycle engine audio evidence and return cautious, evidence-based acoustic observations.
-
-You are NOT:
-- a mechanic physically inspecting the motorcycle
-- allowed to diagnose a specific failed component solely from audio
-- allowed to infer repair history
-- allowed to infer accident history
-
-CORE RULES
-
-1. Judge only acoustic patterns supported by the supplied audio.
-2. If the audio quality is insufficient, return unsure.
-3. Do not guess a mechanical cause.
-4. Describe the observable sound characteristic, not an unsupported diagnosis.
-5. Background noise from other vehicles, people, wind, or handling noise must not be attributed to the inspected motorcycle unless sufficiently distinguishable.
-6. Do not estimate exact RPM unless reliable RPM evidence is explicitly supplied.
-7. Do not claim a component failure solely from audio.
-8. Use cautious language.
-
-Allowed results:
-
-normal
-attention
-unsure
-not_applicable
-
-normal:
-Audio quality is sufficient and no clear acoustic abnormality relevant to the requested item is detected.
-
-attention:
-A clear repeated or significant acoustic pattern is present that warrants attention.
-
-unsure:
-The audio is insufficient or too contaminated for reliable judgment.
-
-For attention and unsure:
-note is required.
-
-For normal:
-note may be null.
-
-Return structured JSON only.`
diff --git a/functions/src/ai/prompts/audio/engine-audio-v2.ts b/functions/src/ai/prompts/audio/engine-audio-v2.ts
new file mode 100644
index 0000000..37c84e4
--- /dev/null
+++ b/functions/src/ai/prompts/audio/engine-audio-v2.ts
@@ -0,0 +1,173 @@
+export const ENGINE_AUDIO_V2_PROMPT_VERSION = 'engine-audio-v2'
+
+/** Verification v2 migration spec §28-§30 — supersedes
+ *  engine-audio-global-v1 + startup/idle/rev-audio-v1 (3 separate calls).
+ *  ONE 23-second recording, ONE Gemini call, 4 items returned together —
+ *  the fixed 0-8/8-15/15-23s timeline is stated explicitly so the model
+ *  never re-derives or shifts phase boundaries itself. */
+export const ENGINE_AUDIO_V2_PROMPT = `You are the MotoVerify motorcycle engine audio inspection engine.
+
+You are given one standardized 23-second motorcycle engine recording.
+
+Fixed timeline:
+
+0.0–8.0 seconds:
+Engine startup phase.
+
+8.0–15.0 seconds:
+Idle phase.
+
+15.0–23.0 seconds:
+Guided throttle / rev phase.
+
+Do NOT move, reinterpret, or infer different time boundaries.
+
+Analyze each requested inspection item independently.
+
+GENERAL AUDIO RULES
+
+1. Analyze only audible evidence.
+
+2. Do not diagnose a specific failed component solely from audio.
+
+3. Do not claim spark plug failure, ignition coil failure, bearing failure, valve failure, piston damage, or another specific mechanical failure from audio alone.
+
+4. You may describe repeated abnormal acoustic patterns.
+
+5. Background speech, wind, traffic, and other vehicles must not be attributed to the inspected motorcycle.
+
+6. Do not estimate exact RPM.
+
+7. Do not determine whether the user reached a particular RPM value.
+
+8. Repeated or significant abnormal acoustic events may be attention.
+
+9. If audio contamination prevents reliable analysis, return unsure.
+
+10. If the supplied recording clearly does not contain any motorcycle engine sound at all (for example: silence, music, speech, or unrelated ambient noise with no engine present), return unsure for every requested item. State in note that no engine sound is present. Do not evaluate acoustic patterns in that case — the absence of an engine is never itself grounds for "normal".
+
+11. Different engine layouts and exhaust systems naturally produce different sounds. Do not mark an unfamiliar but internally consistent sound as attention merely because it is loud or different.
+
+12. Do not identify motorcycle brand or model.
+
+13. Do not calculate vehicle score.
+
+14. The note field must be written in Traditional Chinese (繁體中文，台灣用語習慣) — never Simplified Chinese, never English, never a mix of languages. label stays a short English anomaly-detection tag as specified above, unaffected by this rule.
+
+Allowed results:
+
+normal
+attention
+unsure
+
+For attention and unsure:
+note is required.
+
+--------------------------------------------------
+
+ITEM:
+starter_motor_sound
+
+TIME:
+0.0–8.0 sec
+
+Look for:
+
+- continuity of starter engagement
+- repeated interrupted engagement
+- multiple obvious startup attempts
+- repeated sharp or metallic-like events
+- clearly irregular starter sound
+
+Do NOT diagnose:
+
+battery failure
+starter motor failure
+starter gear failure
+
+--------------------------------------------------
+
+ITEM:
+start_smoothness
+
+TIME:
+0.0–8.0 sec
+
+Evaluate:
+
+starter engagement
+→ engine ignition
+→ transition toward stable operation
+
+Look for:
+
+- unusually prolonged startup
+- repeated startup attempts
+- ignition followed by immediate stop
+- clearly irregular transition
+- repeated interruption
+
+Do NOT diagnose:
+
+fuel-system failure
+ignition-system failure
+low compression
+spark plug failure
+
+--------------------------------------------------
+
+ITEM:
+engine_idle_sound
+
+TIME:
+8.0–15.0 sec
+
+Look for:
+
+- repeated metallic-like knocking events
+- repeated sharp abnormal sounds
+- clearly irregular acoustic cycles
+- abnormal transient sounds
+- substantial inconsistent sound-energy behavior
+
+Do NOT diagnose the cause.
+
+Do not mark normal engine-specific sound as attention just because it is loud or unfamiliar.
+
+--------------------------------------------------
+
+ITEM:
+engine_rev_sound
+
+TIME:
+15.0–23.0 sec
+
+Look for:
+
+- continuity during throttle input
+- repeated abnormal metallic-like sounds
+- abrupt abnormal acoustic events
+- severe irregularity during engine-speed change
+- repeated abnormal sound patterns
+
+Do NOT:
+
+estimate exact RPM
+judge a target RPM
+diagnose a specific failed component`
+
+/** Allowed style: anomaly-detection labels only (e.g.
+ *  repeated_combustion_pattern_irregularity, repeated_metallic_sound,
+ *  irregular_start_transition, multiple_start_attempts,
+ *  abnormal_transient_pattern) — never a named-failure label
+ *  (spark_plug_failure, ignition_coil_failure, bearing_failure,
+ *  valve_failure, piston_failure). This is Anomaly Detection, not Fault
+ *  Diagnosis (spec §30) — enforced by prompt wording only (no schema-level
+ *  enum for `label`, same as every other free-text label field). */
+export const ENGINE_AUDIO_V2_ITEM_IDS = [
+  'starter_motor_sound',
+  'start_smoothness',
+  'engine_idle_sound',
+  'engine_rev_sound',
+] as const
+export type EngineAudioV2ItemId = (typeof ENGINE_AUDIO_V2_ITEM_IDS)[number]
diff --git a/functions/src/ai/prompts/audio/idle-audio-v1.ts b/functions/src/ai/prompts/audio/idle-audio-v1.ts
deleted file mode 100644
index 26dff96..0000000
--- a/functions/src/ai/prompts/audio/idle-audio-v1.ts
+++ /dev/null
@@ -1,27 +0,0 @@
-export const IDLE_AUDIO_PROMPT_VERSION = 'idle-audio-v1'
-
-export const IDLE_AUDIO_PROMPT = `Analyze only the motorcycle idle-engine audio.
-
-ITEM:
-engine_idle_sound
-
-Look for:
-- repeated metallic-like knocking sounds
-- obvious irregular acoustic events
-- repeated sharp/high-frequency abnormal sounds
-- strong unexpected energy variation
-- unstable repeated engine-sound patterns
-
-Do NOT diagnose the mechanical cause.
-
-Do NOT claim:
-- valve failure
-- piston knock
-- bearing failure
-- injector failure
-unless such information is provided by another verified measurement source.
-
-If background noise prevents reliable separation:
-return unsure.`
-
-export const IDLE_AUDIO_ITEM_IDS = ['engine_idle_sound'] as const
diff --git a/functions/src/ai/prompts/audio/rev-audio-v1.ts b/functions/src/ai/prompts/audio/rev-audio-v1.ts
deleted file mode 100644
index 722c761..0000000
--- a/functions/src/ai/prompts/audio/rev-audio-v1.ts
+++ /dev/null
@@ -1,22 +0,0 @@
-export const REV_AUDIO_PROMPT_VERSION = 'rev-audio-v1'
-
-export const REV_AUDIO_PROMPT = `Analyze only the motorcycle engine audio during the guided throttle session.
-
-ITEM:
-engine_rev_sound
-
-Look for:
-- continuity of engine sound while throttle input changes
-- repeated abnormal metallic-like sounds
-- sudden sharp abnormal acoustic events
-- irregular sound transitions
-- abnormal sound patterns that appear repeatedly during throttle changes
-
-Do NOT estimate exact RPM.
-
-Do NOT diagnose a specific failed component.
-
-If environmental noise or recording quality prevents reliable assessment:
-return unsure.`
-
-export const REV_AUDIO_ITEM_IDS = ['engine_rev_sound'] as const
diff --git a/functions/src/ai/prompts/audio/startup-audio-v1.ts b/functions/src/ai/prompts/audio/startup-audio-v1.ts
deleted file mode 100644
index 738fbcb..0000000
--- a/functions/src/ai/prompts/audio/startup-audio-v1.ts
+++ /dev/null
@@ -1,44 +0,0 @@
-export const STARTUP_AUDIO_PROMPT_VERSION = 'startup-audio-v1'
-
-export const STARTUP_AUDIO_PROMPT = `Analyze this motorcycle startup audio.
-
-Requested items:
-
-1. starter_motor_sound
-2. start_smoothness
-
-starter_motor_sound:
-
-Listen for:
-- continuity of starter-motor sound
-- repeated interrupted starter engagement
-- abnormal sharp or metallic sound patterns
-- multiple clear startup attempts
-
-Do NOT diagnose:
-- starter motor failure
-- battery failure
-- gear failure
-
-start_smoothness:
-
-Evaluate the acoustic transition from:
-starter engagement
-→ engine ignition
-→ stable idle
-
-Look for:
-- unusually prolonged startup sequence
-- repeated attempts
-- ignition followed by immediate stop
-- obvious irregular transition into idle
-
-Do NOT diagnose:
-- fuel-system failure
-- ignition-system failure
-- low compression
-
-Analyze both items independently.`
-
-export const STARTUP_AUDIO_ITEM_IDS = ['starter_motor_sound', 'start_smoothness'] as const
-export type StartupAudioItemId = (typeof STARTUP_AUDIO_ITEM_IDS)[number]
diff --git a/functions/src/ai/prompts/cold-engine-touch-v3.ts b/functions/src/ai/prompts/cold-engine-touch-v3.ts
new file mode 100644
index 0000000..b5b739f
--- /dev/null
+++ b/functions/src/ai/prompts/cold-engine-touch-v3.ts
@@ -0,0 +1,80 @@
+export const COLD_ENGINE_TOUCH_PROMPT_VERSION = 'cold-engine-touch-v3'
+export const COLD_ENGINE_TOUCH_ITEM_ID = 'cold_engine_touch_check'
+
+/** Verification v2 migration spec §21 — supersedes cold-engine-touch-v2
+ *  (kept in place for reference/history). Same result/schema contract as
+ *  v2 (normal/attention/unsure + contactVisible/contactMaintainedFullWindow/
+ *  targetAreaVisible — cold-touch.service.ts's coldStateValid stamping logic
+ *  is unchanged, only the prompt wording moved to the v2 migration spec's
+ *  text). */
+export const COLD_ENGINE_TOUCH_PROMPT = `You are the MotoVerify cold-state procedure verification engine.
+
+The supplied sequential frames come from a known five-second contact window recorded before engine startup.
+
+Your task is to determine whether the required cold-state touch procedure was successfully completed.
+
+Evaluate only:
+
+- whether the designated engine exterior reference area is visible
+- whether a hand or finger visibly contacts the designated area
+- whether contact appears maintained throughout the supplied five-second frame sequence
+- whether obstruction, blur, or framing prevents reliable verification
+
+Do NOT:
+
+- estimate engine temperature
+- claim an exact temperature
+- diagnose engine condition
+- diagnose cooling-system condition
+- identify mechanical failure
+- identify motorcycle brand or model
+
+RESULTS
+
+normal:
+The full five-second contact procedure is sufficiently supported by visual evidence.
+
+attention:
+The evidence clearly shows that the full required five-second contact procedure was not completed.
+
+unsure:
+The video evidence is insufficient to determine whether the procedure was completed.
+
+For attention and unsure:
+note is required.
+
+The note field must be written in Traditional Chinese (繁體中文，台灣用語習慣) — never Simplified Chinese, never English, never a mix of languages. label stays a short English machine tag, unaffected by this rule.
+
+Return structured JSON only.`
+
+export const COLD_ENGINE_TOUCH_SCHEMA = {
+  type: 'object',
+  properties: {
+    result: { type: 'string', enum: ['normal', 'attention', 'unsure', 'not_applicable'] },
+    confidence: { type: ['number', 'null'] },
+    label: { type: 'string' },
+    note: { type: ['string', 'null'] },
+    contactVisible: { type: 'boolean' },
+    contactMaintainedFullWindow: { type: 'boolean' },
+    targetAreaVisible: { type: 'boolean' },
+  },
+  required: [
+    'result',
+    'confidence',
+    'label',
+    'note',
+    'contactVisible',
+    'contactMaintainedFullWindow',
+    'targetAreaVisible',
+  ],
+}
+
+export interface ColdEngineTouchResult {
+  result: 'normal' | 'attention' | 'unsure' | 'not_applicable'
+  confidence: number | null
+  label: string
+  note: string | null
+  contactVisible: boolean
+  contactMaintainedFullWindow: boolean
+  targetAreaVisible: boolean
+}
diff --git a/functions/src/ai/prompts/core-vision-v2.ts b/functions/src/ai/prompts/core-vision-v2.ts
new file mode 100644
index 0000000..c6a7d62
--- /dev/null
+++ b/functions/src/ai/prompts/core-vision-v2.ts
@@ -0,0 +1,207 @@
+export const CORE_VISION_V2_PROMPT_VERSION = 'core-vision-v2'
+
+/** Verification v2 migration spec §14-§16 — supersedes Group A (exterior-v1),
+ *  Group B (chassis-v1), and Group C (engine-powertrain-v1). Consolidates
+ *  the 3 surviving Group A items (body_damage/paint_condition/
+ *  body_alignment_visual, unchanged), the 1 surviving Group B item
+ *  (front_suspension_condition, unchanged), and the 3 surviving/renamed
+ *  Group C items (engine_bottom_leak_condition/engine_bottom_external_
+ *  condition — narrowed to engine_bottom only, engine_left/engine_right no
+ *  long
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 706fbf8

---

### iOS 安全區域跑版、加入左滑返回手勢、修正錄音外掛未編譯問題 `7e8f354`

- 使用者：Archi
- 時間：2026-09-07 20:14
- 分類：系統
- 類型：修復

#### Prompt
請你 mr dev的內容到目前的分支，如果有任何的衝突請以能保持讓Ios 運行並且能確保dev 的新功能為優先，如果其他的狀況請詢問我，不要隨意修改，謝謝

#### 摘要
- index.html 加上 viewport-fit=cover，讓已寫好的 env(safe-area-inset-*)
  真正生效，內容不再被瀏海/狀態列遮住
- 新增 MainViewController 啟用 WKWebView 的 allowsBackForwardNavigationGestures，
  讓 Vue Router 的 history 導覽支援原生左滑返回手勢
- capacitor-voice-recorder 沒有 Package.swift，SPM 抓不到導致原生外掛完全
  沒編譯進 App，呼叫錄音相關 API 永遠卡住無回應；改用 patch-package 幫它
  補上相容 SPM 的 Package.swift（拆成 ObjC/Swift 兩個 target），並加上
  postinstall script 確保重新 npm install 後修正不會消失

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/index.html b/index.html
index 6c1f731..bd21e18 100644
--- a/index.html
+++ b/index.html
@@ -3,7 +3,10 @@
   <head>
     <meta charset="UTF-8" />
     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
-    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
+    <meta
+      name="viewport"
+      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
+    />
     <title>Motorcycle Verification Platform</title>
   </head>
   <body>
diff --git a/ios/App/App.xcodeproj/project.pbxproj b/ios/App/App.xcodeproj/project.pbxproj
index 4a01fbd..b8cc2c6 100644
--- a/ios/App/App.xcodeproj/project.pbxproj
+++ b/ios/App/App.xcodeproj/project.pbxproj
@@ -16,6 +16,7 @@
 		504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */ = {isa = PBXBuildFile; fileRef = 504EC3101FED79650016851F /* LaunchScreen.storyboard */; };
 		50B271D11FEDC1A000F3C39B /* public in Resources */ = {isa = PBXBuildFile; fileRef = 50B271D01FEDC1A000F3C39B /* public */; };
 		9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 9582B6822FE993A50072D4E8 /* SceneDelegate.swift */; };
+		00AA11BB22CC33DD44EE5502 /* MainViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = 00AA11BB22CC33DD44EE5501 /* MainViewController.swift */; };
 /* End PBXBuildFile section */
 
 /* Begin PBXFileReference section */
@@ -30,6 +31,7 @@
 		50B271D01FEDC1A000F3C39B /* public */ = {isa = PBXFileReference; lastKnownFileType = folder; path = public; sourceTree = "<group>"; };
 		9582B6822FE993A50072D4E8 /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SceneDelegate.swift; sourceTree = "<group>"; };
 		958DCC722DB07C7200EA8C5F /* debug.xcconfig */ = {isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = debug.xcconfig; path = ../debug.xcconfig; sourceTree = SOURCE_ROOT; };
+		00AA11BB22CC33DD44EE5501 /* MainViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MainViewController.swift; sourceTree = "<group>"; };
 /* End PBXFileReference section */
 
 /* Begin PBXFrameworksBuildPhase section */
@@ -67,6 +69,7 @@
 				9582B6822FE993A50072D4E8 /* SceneDelegate.swift */,
 				50379B222058CBB4000EE86E /* capacitor.config.json */,
 				504EC3071FED79650016851F /* AppDelegate.swift */,
+				00AA11BB22CC33DD44EE5501 /* MainViewController.swift */,
 				504EC30B1FED79650016851F /* Main.storyboard */,
 				504EC30E1FED79650016851F /* Assets.xcassets */,
 				504EC3101FED79650016851F /* LaunchScreen.storyboard */,
@@ -159,6 +162,7 @@
 			buildActionMask = 2147483647;
 			files = (
 				504EC3081FED79650016851F /* AppDelegate.swift in Sources */,
+				00AA11BB22CC33DD44EE5502 /* MainViewController.swift in Sources */,
 				9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */,
 			);
 			runOnlyForDeploymentPostprocessing = 0;
diff --git a/ios/App/App/Base.lproj/Main.storyboard b/ios/App/App/Base.lproj/Main.storyboard
index b44df7b..b09af01 100644
--- a/ios/App/App/Base.lproj/Main.storyboard
+++ b/ios/App/App/Base.lproj/Main.storyboard
@@ -11,7 +11,7 @@
         <!--Bridge View Controller-->
         <scene sceneID="tne-QT-ifu">
             <objects>
-                <viewController id="BYZ-38-t0r" customClass="CAPBridgeViewController" customModule="Capacitor" sceneMemberID="viewController"/>
+                <viewController id="BYZ-38-t0r" customClass="MainViewController" customModule="App" customModuleProvider="target" sceneMemberID="viewController"/>
                 <placeholder placeholderIdentifier="IBFirstResponder" id="dkx-z0-nzr" sceneMemberID="firstResponder"/>
             </objects>
         </scene>
diff --git a/ios/App/App/MainViewController.swift b/ios/App/App/MainViewController.swift
new file mode 100644
index 0000000..f27e83a
--- /dev/null
+++ b/ios/App/App/MainViewController.swift
@@ -0,0 +1,7 @@
+import Capacitor
+
+class MainViewController: CAPBridgeViewController {
+    override func capacitorDidLoad() {
+        webView?.allowsBackForwardNavigationGestures = true
+    }
+}
diff --git a/ios/App/CapApp-SPM/Package.swift b/ios/App/CapApp-SPM/Package.swift
index 06cac7c..d94e243 100644
--- a/ios/App/CapApp-SPM/Package.swift
+++ b/ios/App/CapApp-SPM/Package.swift
@@ -13,7 +13,8 @@ let package = Package(
     dependencies: [
         .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0"),
         .package(name: "CapacitorCommunityBluetoothLe", path: "../../../node_modules/@capacitor-community/bluetooth-le"),
-        .package(name: "CapacitorCamera", path: "../../../node_modules/@capacitor/camera")
+        .package(name: "CapacitorCamera", path: "../../../node_modules/@capacitor/camera"),
+        .package(name: "CapacitorVoiceRecorder", path: "../../../node_modules/capacitor-voice-recorder")
     ],
     targets: [
         .target(
@@ -22,7 +23,8 @@ let package = Package(
                 .product(name: "Capacitor", package: "capacitor-swift-pm"),
                 .product(name: "Cordova", package: "capacitor-swift-pm"),
                 .product(name: "CapacitorCommunityBluetoothLe", package: "CapacitorCommunityBluetoothLe"),
-                .product(name: "CapacitorCamera", package: "CapacitorCamera")
+                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
+                .product(name: "CapacitorVoiceRecorder", package: "CapacitorVoiceRecorder")
             ]
         )
     ]
diff --git a/package-lock.json b/package-lock.json
index 71b3b55..99d6d2f 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -32,6 +32,7 @@
         "eslint": "^10.9.1",
         "eslint-plugin-vue": "^10.10.0",
         "globals": "^17.11.0",
+        "patch-package": "^8.0.1",
         "prettier": "^3.9.6",
         "typescript": "~6.0.2",
         "typescript-eslint": "^8.68.0",
@@ -2299,6 +2300,13 @@
         "node": ">=14.6"
       }
     },
+    "node_modules/@yarnpkg/lockfile": {
+      "version": "1.1.0",
+      "resolved": "https://registry.npmjs.org/@yarnpkg/lockfile/-/lockfile-1.1.0.tgz",
+      "integrity": "sha512-GpSwvyXOcOOlV70vbnzjj4fW5xW/FdUF6nQEt1ENy7m4ZCczi1+/buVUPAqmGfqznsORNFzUMjctTIp8a9tuCQ==",
+      "dev": true,
+      "license": "BSD-2-Clause"
+    },
     "node_modules/acorn": {
       "version": "8.18.0",
       "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.18.0.tgz",
@@ -2538,6 +2546,56 @@
         "node": "*"
       }
     },
+    "node_modules/call-bind": {
+      "version": "1.0.9",
+      "resolved": "https://registry.npmjs.org/call-bind/-/call-bind-1.0.9.tgz",
+      "integrity": "sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "call-bind-apply-helpers": "^1.0.2",
+        "es-define-property": "^1.0.1",
+        "get-intrinsic": "^1.3.0",
+        "set-function-length": "^1.2.2"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
+    "node_modules/call-bind-apply-helpers": {
+      "version": "1.0.2",
+      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
+      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "es-errors": "^1.3.0",
+        "function-bind": "^1.1.2"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
+    "node_modules/call-bound": {
+      "version": "1.0.4",
+      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
+      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "call-bind-apply-helpers": "^1.0.2",
+        "get-intrinsic": "^1.3.0"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
     "node_modules/capacitor-blob-writer": {
       "version": "1.1.20",
       "resolved": "https://registry.npmjs.org/capacitor-blob-writer/-/capacitor-blob-writer-1.1.20.tgz",
@@ -2561,6 +2619,23 @@
         "@capacitor/core": ">=7.0.0"
       }
     },
+    "node_modules/chalk": {
+      "version": "4.1.2",
+      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
+      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "ansi-styles": "^4.1.0",
+        "supports-color": "^7.1.0"
+      },
+      "engines": {
+        "node": ">=10"
+      },
+      "funding": {
+        "url": "https://github.com/chalk/chalk?sponsor=1"
+      }
+    },
     "node_modules/chokidar": {
       "version": "5.0.0",
       "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-5.0.0.tgz",
@@ -2586,6 +2661,22 @@
         "node": ">=18"
       }
     },
+    "node_modules/ci-info": {
+      "version": "3.9.0",
+      "resolved": "https://registry.npmjs.org/ci-info/-/ci-info-3.9.0.tgz",
+      "integrity": "sha512-NIxF55hv4nSqQswkAeiOi1r83xy8JldOFDTWiug55KBu9Jnblncd2U6ViHmYgHf01TPZS77NJBhBMKdWj9HQMQ==",
+      "dev": true,
+      "funding": [
+        {
+          "type": "github",
+          "url": "https://github.com/sponsors/sibiraj-s"
+        }
+      ],
+      "license": "MIT",
+      "engines": {
+        "node": ">=8"
+      }
+    },
     "node_modules/cliui": {
       "version": "8.0.1",
       "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
@@ -2693,6 +2784,24 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/define-data-property": {
+      "version": "1.1.4",
+      "resolved": "https://registry.npmjs.org/define-data-property/-/define-data-property-1.1.4.tgz",
+      "integrity": "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "es-define-property": "^1.0.0",
+        "es-errors": "^1.3.0",
+        "gopd": "^1.0.1"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
     "node_modules/define-lazy-prop": {
       "version": "2.0.0",
       "resolved": "https://registry.npmjs.org/define-lazy-prop/-/define-lazy-prop-2.0.0.tgz",
@@ -2713,6 +2822,21 @@
         "node": ">=8"
       }
     },
+    "node_modules/dunder-proto": {
+      "version": "1.0.1",
+      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
+      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "call-bind-apply-helpers": "^1.0.1",
+        "es-errors": "^1.3.0",
+        "gopd": "^1.2.0"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
     "node_modules/elementtree": {
       "version": "0.1.7",
       "resolved": "https://registry.npmjs.org/elementtree/-/elementtree-0.1.7.tgz",
@@ -2754,6 +2878,39 @@
         "node": ">=6"
       }
     },
+    "node_modules/es-define-property": {
+      "version": "1.0.1",
+      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
+      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
+    "node_modules/es-errors": {
+      "version": "1.3.0",
+      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
+      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
+    "node_modules/es-object-atoms": {
+      "version": "1.1.2",
+      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
+      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "es-errors": "^1.3.0"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
     "node_modules/escalade": {
       "version": "3.2.0",
       "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
@@ -3198,6 +3355,16 @@
         "url": "https://github.com/sponsors/sindresorhus"
       }
     },
+    "node_modules/find-yarn-workspace-root": {
+      "version": "2.0.0",
+      "resolved": "https://registry.npmjs.org/find-yarn-workspace-root/-/find-yarn-workspace-root-2.0.0.tgz",
+      "integrity": "sha512-1IMnbjt4KzsQfnhnzNd8wUEgXZ44IzZaZmnLYx7D5FZlaHt2gW20Cri8Q+E/t5tIj4+epTBub+2Zxu/vNILzqQ==",
+      "dev": true,
+      "license": "Apache-2.0",
+      "dependencies": {
+        "micromatch": "^4.0.2"
+      }
+    },
     "node_modules/firebase": {
       "version": "12.18.0",
       "resolved": "https://registry.npmjs.org/firebase/-/firebase-12.18.0.tgz",
@@ -3284,6 +3451,16 @@
         "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
       }
     },
+    "node_modules/function-bind": {
+      "version": "1.1.2",
+      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
+      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
+      "dev": true,
+      "license": "MIT",
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
     "node_modules/get-blob-duration": {
       "version": "1.2.0",
       "resolved": "https://registry.npmjs.org/get-blob-duration/-/get-blob-duration-1.2.0.tgz",
@@ -3302,6 +3479,45 @@
         "node": "6.* || 8.* || >= 10.*"
       }
     },
+    "node_modules/get-intrinsic": {
+      "version": "1.3.0",
+      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
+      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "call-bind-apply-helpers": "^1.0.2",
+        "es-define-property": "^1.0.1",
+        "es-errors": "^1.3.0",
+        "es-object-atoms": "^1.1.1",
+        "function-bind": "^1.1.2",
+        "get-proto": "^1.0.1",
+        "gopd": "^1.2.0",
+        "has-symbols": "^1.1.0",
+        "hasown": "^2.0.2",
+        "math-intrinsics": "^1.1.0"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
+    "node_modules/get-proto": {
+      "version": "1.0.1",
+      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
+      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "dunder-proto": "^1.0.1",
+        "es-object-atoms": "^1.0.0"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
     "node_modules/glob": {
       "version": "13.0.6",
       "resolved": "https://registry.npmjs.org/glob/-/glob-13.0.6.tgz",
@@ -3346,6 +3562,19 @@
         "url": "https://github.com/sponsors/sindresorhus"
       }
     },
+    "node_modules/gopd": {
+      "version": "1.2.0",
+      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
+      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
     "node_modules/graceful-fs": {
       "version": "4.2.11",
       "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
@@ -3353,6 +3582,55 @@
       "dev": true,
       "license": "ISC"
     },
+    "node_modules/has-flag": {
+      "version": "4.0.0",
+      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
+      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=8"
+      }
+    },
+    "node_modules/has-property-descriptors": {
+      "version": "1.0.2",
+      "resolved": "https://registry.npmjs.org/has-property-descriptors/-/has-property-descriptors-1.0.2.tgz",
+      "integrity": "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "es-define-property": "^1.0.0"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
+    "node_modules/has-symbols": {
+      "version": "1.1.0",
+      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
+      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
+    "node_modules/hasown": {
+      "version": "2.0.4",
+      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
+      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "function-bind": "^1.1.2"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
     "node_modules/hookable": {
       "version": "5.5.3",
       "resolved": "https://registry.npmjs.org/hookable/-/hookable-5.5.3.tgz",
@@ -3479,6 +3757,13 @@
         "node": ">=8"
       }
     },
+    "node_modules/isarray": {
+      "version": "2.0.5",
+      "resolved": "https://registry.npmjs.org/isarray/-/isarray-2.0.5.tgz",
+      "integrity": "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==",
+      "dev": true,
+      "license": "MIT"
+    },
     "node_modules/isexe": {
       "version": "2.0.0",
       "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
@@ -3512,6 +3797,26 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/json-stable-stringify": {
+      "version": "1.3.0",
+      "resolved": "https://registry.npmjs.org/json-stable-stringify/-/json-stable-stringify-1.3.0.tgz",
+      "integrity": "sha512-qtYiSSFlwot9XHtF9bD9c7rwKjr+RecWT//ZnPvSmEjpV5mmPOCN4j8UjY5hbjNkOwZ/jQv3J6R1/pL7RwgMsg==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "call-bind": "^1.0.8",
+        "call-bound": "^1.0.4",
+        "isarray": "^2.0.5",
+        "jsonify": "^0.0.1",
+        "object-keys": "^1.1.1"
+      },
+      "engines": {
+        "node": ">= 0.4"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/ljharb"
+      }
+    },
     "node_modules/json-stable-stringify-without-jsonify": {
       "version": "1.0.1",
       "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
@@ -3544,6 +3849,16 @@
         "graceful-fs": "^4.1.6"
       }
     },
+    "node_modules/jsonify": {
+      "version": "0.0.1",
+
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 7e8f354

#### 時數
0

---

### Merge remote-tracking branch 'origin/develop' into backstage `8581d2b`

- 使用者：Archi
- 時間：2026-09-07 20:18
- 分類：系統
- 類型：合併

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
# Conflicts:
#	ios/App/CapApp-SPM/Package.swift

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --cc ios/App/CapApp-SPM/Package.swift
index d94e243,14296cd..1b1657e
--- a/ios/App/CapApp-SPM/Package.swift
+++ b/ios/App/CapApp-SPM/Package.swift
@@@ -12,9 -12,11 +12,12 @@@ let package = Package
      ],
      dependencies: [
          .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.0"),
 -        .package(name: "CapacitorCommunityBluetoothLe", path: "..\..\..\node_modules\@capacitor-community\bluetooth-le"),
 -        .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app"),
 -        .package(name: "CapacitorCamera", path: "..\..\..\node_modules\@capacitor\camera"),
 -        .package(name: "CapacitorFilesystem", path: "..\..\..\node_modules\@capacitor\filesystem"),
 -        .package(name: "CapacitorPreferences", path: "..\..\..\node_modules\@capacitor\preferences")
 +        .package(name: "CapacitorCommunityBluetoothLe", path: "../../../node_modules/@capacitor-community/bluetooth-le"),
++        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
 +        .package(name: "CapacitorCamera", path: "../../../node_modules/@capacitor/camera"),
++        .package(name: "CapacitorFilesystem", path: "../../../node_modules/@capacitor/filesystem"),
++        .package(name: "CapacitorPreferences", path: "../../../node_modules/@capacitor/preferences"),
 +        .package(name: "CapacitorVoiceRecorder", path: "../../../node_modules/capacitor-voice-recorder")
      ],
      targets: [
          .target(
@@@ -23,8 -25,10 +26,11 @@@
                  .product(name: "Capacitor", package: "capacitor-swift-pm"),
                  .product(name: "Cordova", package: "capacitor-swift-pm"),
                  .product(name: "CapacitorCommunityBluetoothLe", package: "CapacitorCommunityBluetoothLe"),
+                 .product(name: "CapacitorApp", package: "CapacitorApp"),
                  .product(name: "CapacitorCamera", package: "CapacitorCamera"),
+                 .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
 -                .product(name: "CapacitorPreferences", package: "CapacitorPreferences")
++                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
 +                .product(name: "CapacitorVoiceRecorder", package: "CapacitorVoiceRecorder")
              ]
          )
      ]
```

</details>

#### 結果
已提交 commit 8581d2b

#### 時數
0.1

---

### 移除跟 develop 重複的 MainViewController.swift `004d503`

- 使用者：Archi
- 時間：2026-09-07 20:20
- 分類：系統
- 類型：修復

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
develop 的 SceneDelegate.swift 已經內建同名同功能的 MainViewController
(啟用 WKWebView 左滑返回手勢)，並以程式碼直接接管 rootViewController，
與本地新增的獨立檔案造成重複類別宣告、編譯失敗。保留 develop 版本
(功能相同且已整合進場景生命週期)，移除本地檔案並將 Main.storyboard
的 customClass 還原為預設的 CAPBridgeViewController。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/ios/App/App/MainViewController.swift b/ios/App/App/MainViewController.swift
deleted file mode 100644
index f27e83a..0000000
--- a/ios/App/App/MainViewController.swift
+++ /dev/null
@@ -1,7 +0,0 @@
-import Capacitor
-
-class MainViewController: CAPBridgeViewController {
-    override func capacitorDidLoad() {
-        webView?.allowsBackForwardNavigationGestures = true
-    }
-}
diff --git a/package-lock.json b/package-lock.json
index 2f20c70..e0c7a0a 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -7,6 +7,7 @@
     "": {
       "name": "motorcycle-verification-platform",
       "version": "0.1.0",
+      "hasInstallScript": true,
       "dependencies": {
         "@capacitor-community/bluetooth-le": "^8.3.0",
         "@capacitor/android": "^8.5.0",
```

</details>

#### 結果
已提交 commit 004d503

#### 時數
0

---

## 2026年9月8日 週二

### 加油紀錄公升數欄位只能輸入到小數點後一位 `3701252`

- 使用者：Archi
- 時間：2026-09-08 00:42
- 分類：前台
- 類型：修復

#### Prompt
幫我把目前版本的app update到手機上

#### 摘要
input 的 step="0.1" 讓瀏覽器原生驗證拒絕兩位小數的輸入(例如 3.64)，
跳出 "Enter a valid value" 擋住儲存。改成 step="0.01"，liters 本來就是
number 型別，不需要改資料結構。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/views/VehicleDetailView.vue b/src/views/VehicleDetailView.vue
index ad85c7c..4ef494a 100644
--- a/src/views/VehicleDetailView.vue
+++ b/src/views/VehicleDetailView.vue
@@ -485,7 +485,7 @@ onMounted(async () => {
         </label>
         <label>
           <span>公升數（L）</span>
-          <input v-model="fuelForm.liters" type="number" min="0" step="0.1" />
+          <input v-model="fuelForm.liters" type="number" min="0" step="0.01" />
         </label>
         <label>
           <span>金額（元）</span>
```

</details>

#### 結果
已提交 commit 3701252

#### 時數
0.2

---

### 市場刊登詳情頁的標題與封面照片間加上間距 `cbecb8f`

- 使用者：Archi
- 時間：2026-09-08 00:59
- 分類：前台
- 類型：修復

#### Prompt
不會彈跳，還是被蓋住

#### 摘要
AppHeader 跟 hero 照片緊貼在一起沒有留白，視覺上太擠。加上
margin-top 讓兩者之間有呼吸空間。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/views/MarketplaceListingView.vue b/src/views/MarketplaceListingView.vue
index 0f064fc..217caec 100644
--- a/src/views/MarketplaceListingView.vue
+++ b/src/views/MarketplaceListingView.vue
@@ -374,6 +374,7 @@ async function handleBookingSubmit(payload: { scheduledAt: number }): Promise<vo
 
 .hero {
   position: relative;
+  margin-top: var(--space-sm);
   height: 260px;
   display: flex;
   align-items: center;
```

</details>

#### 結果
已提交 commit cbecb8f

#### 時數
0.1

---

### 關閉雙擊縮放、新增深色模式與「調整設置」選單 `4d6ff04`

- 使用者：Archi
- 時間：2026-09-08 01:23
- 分類：前台
- 類型：功能

#### Prompt
在ios的介面上移除雙擊畫面會局部放的的控制，如果可以的話嘗試做看看深色模式的畫面，並在「我的」頁面增加「調整設置」的功能選單，然後把這個放在裡面，未來裡面也要加入語言切換、字體大小等。然後目前的訊息通知是不會跟手機的通知連動的嗎

#### 摘要
- index.html viewport 加上 maximum-scale=1.0, user-scalable=no，關閉
  WKWebView 的雙擊/雙指縮放手勢；加上 color-scheme meta 讓瀏覽器原生
  元件也能跟著切換色調
- 新增 theme.store.ts：淺色/深色/跟隨系統三種模式，用 @capacitor/
  preferences 持久化，並在 main.ts 啟動時初始化、套用 data-theme 屬性
- tokens.css 新增 :root[data-theme='dark'] 深色顏色變數，沿用既有
  CSS variable 架構，多數頁面免改就能套用
- 「我的」頁面新增「調整設置」選單項，新頁面可切換外觀主題，並預留
  語言、字體大小兩個「即將推出」項目供未來擴充

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/index.html b/index.html
index bd21e18..e85b94f 100644
--- a/index.html
+++ b/index.html
@@ -5,8 +5,9 @@
     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
     <meta
       name="viewport"
-      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
+      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
     />
+    <meta name="color-scheme" content="light dark" />
     <title>Motorcycle Verification Platform</title>
   </head>
   <body>
diff --git a/src/main.ts b/src/main.ts
index c83f9c1..79b6877 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -5,6 +5,7 @@ import { createApp } from 'vue'
 import App from './App.vue'
 import router from './router'
 import { platformService } from './services/platform/platform.service'
+import { useThemeStore } from './stores/theme.store'
 import './style.css'
 
 const app = createApp(App)
@@ -12,6 +13,8 @@ const app = createApp(App)
 app.use(createPinia())
 app.use(router)
 
+void useThemeStore().initialize()
+
 /**
  * Android hardware back button + system edge-swipe-back gesture: Capacitor's
  * Android runtime does NOT wire this to the webview's history on its own
diff --git a/src/router/index.ts b/src/router/index.ts
index 9c65cd3..2082be6 100644
--- a/src/router/index.ts
+++ b/src/router/index.ts
@@ -139,6 +139,12 @@ const router = createRouter({
       component: () => import('@/views/NotificationSettingsView.vue'),
       meta: { requiresAuth: true },
     },
+    {
+      path: '/settings/preferences',
+      name: 'settings-preferences',
+      component: () => import('@/views/PreferencesSettingsView.vue'),
+      meta: { requiresAuth: true },
+    },
     {
       path: '/settings/privacy',
       name: 'settings-privacy',
diff --git a/src/stores/theme.store.ts b/src/stores/theme.store.ts
new file mode 100644
index 0000000..e7e4062
--- /dev/null
+++ b/src/stores/theme.store.ts
@@ -0,0 +1,43 @@
+import { Preferences } from '@capacitor/preferences'
+import { defineStore } from 'pinia'
+import { ref } from 'vue'
+
+export type ThemeMode = 'light' | 'dark' | 'system'
+
+const STORAGE_KEY = 'theme-mode'
+const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
+
+function resolve(mode: ThemeMode): 'light' | 'dark' {
+  return mode === 'system' ? (darkMediaQuery.matches ? 'dark' : 'light') : mode
+}
+
+function applyToDocument(mode: ThemeMode): void {
+  document.documentElement.setAttribute('data-theme', resolve(mode))
+}
+
+export const useThemeStore = defineStore('theme', () => {
+  const mode = ref<ThemeMode>('system')
+
+  /** Applies the system-preference guess synchronously (no flash while the
+   *  persisted choice loads), then swaps in the saved value once read. */
+  async function initialize(): Promise<void> {
+    applyToDocument(mode.value)
+    darkMediaQuery.addEventListener('change', () => {
+      if (mode.value === 'system') applyToDocument(mode.value)
+    })
+
+    const { value } = await Preferences.get({ key: STORAGE_KEY })
+    if (value === 'light' || value === 'dark' || value === 'system') {
+      mode.value = value
+      applyToDocument(mode.value)
+    }
+  }
+
+  async function setMode(next: ThemeMode): Promise<void> {
+    mode.value = next
+    applyToDocument(next)
+    await Preferences.set({ key: STORAGE_KEY, value: next })
+  }
+
+  return { mode, initialize, setMode }
+})
diff --git a/src/styles/tokens.css b/src/styles/tokens.css
index 35e7640..e122c7a 100644
--- a/src/styles/tokens.css
+++ b/src/styles/tokens.css
@@ -44,3 +44,22 @@
   --bottom-nav-height: 60px;
   --header-height: 56px;
 }
+
+:root[data-theme='dark'] {
+  --color-primary: #4c8dff;
+  --color-primary-bg: #16233f;
+  --color-background: #0e1116;
+  --color-surface: #1a1e26;
+  --color-border: #2b303a;
+  --color-text-primary: #eef1f6;
+  --color-text-secondary: #9aa3b2;
+  --color-text-disabled: #5b6472;
+  --color-success: #34d074;
+  --color-success-bg: #0f2a1c;
+  --color-warning: #f5a623;
+  --color-warning-bg: #332508;
+  --color-danger: #ff6259;
+  --color-danger-bg: #341714;
+
+  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.35);
+}
diff --git a/src/views/PreferencesSettingsView.vue b/src/views/PreferencesSettingsView.vue
new file mode 100644
index 0000000..040ba9a
--- /dev/null
+++ b/src/views/PreferencesSettingsView.vue
@@ -0,0 +1,111 @@
+<script setup lang="ts">
+import { Check, Languages, Monitor, Moon, Sun, Type } from 'lucide-vue-next'
+
+import AppHeader from '@/components/common/AppHeader.vue'
+import { useThemeStore } from '@/stores/theme.store'
+import type { ThemeMode } from '@/stores/theme.store'
+
+const themeStore = useThemeStore()
+
+const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
+  { mode: 'light', label: '淺色', icon: Sun },
+  { mode: 'dark', label: '深色', icon: Moon },
+  { mode: 'system', label: '跟隨系統', icon: Monitor },
+]
+</script>
+
+<template>
+  <div>
+    <AppHeader title="調整設置" back />
+
+    <div class="content">
+      <div class="section">
+        <p class="section-title">外觀</p>
+        <div class="option-list">
+          <button
+            v-for="option in themeOptions"
+            :key="option.mode"
+            class="option-row"
+            @click="themeStore.setMode(option.mode)"
+          >
+            <component :is="option.icon" :size="18" color="var(--color-text-secondary)" />
+            <span>{{ option.label }}</span>
+            <Check v-if="themeStore.mode === option.mode" :size="18" color="var(--color-primary)" />
+          </button>
+        </div>
+      </div>
+
+      <div class="section">
+        <p class="section-title">其他</p>
+        <div class="option-list">
+          <button class="option-row" disabled>
+            <Languages :size="18" color="var(--color-text-disabled)" />
+            <span>語言</span>
+            <span class="coming-soon">即將推出</span>
+          </button>
+          <button class="option-row" disabled>
+            <Type :size="18" color="var(--color-text-disabled)" />
+            <span>字體大小</span>
+            <span class="coming-soon">即將推出</span>
+          </button>
+        </div>
+      </div>
+    </div>
+  </div>
+</template>
+
+<style scoped>
+.content {
+  padding: var(--space-md);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-lg);
+}
+
+.section-title {
+  font-size: 13px;
+  font-weight: 700;
+  color: var(--color-text-secondary);
+  margin-bottom: var(--space-sm);
+}
+
+.option-list {
+  display: flex;
+  flex-direction: column;
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  overflow: hidden;
+}
+
+.option-row {
+  display: flex;
+  align-items: center;
+  gap: var(--space-md);
+  padding: var(--space-md);
+  border: none;
+  background: transparent;
+  font-size: 14px;
+  font-weight: 600;
+  color: var(--color-text-primary);
+  text-align: left;
+}
+
+.option-row:not(:last-child) {
+  border-bottom: 1px solid var(--color-border);
+}
+
+.option-row span:first-of-type {
+  flex: 1;
+}
+
+.option-row:disabled {
+  color: var(--color-text-disabled);
+}
+
+.coming-soon {
+  font-size: 12px;
+  font-weight: 600;
+  color: var(--color-text-disabled);
+}
+</style>
diff --git a/src/views/SettingsView.vue b/src/views/SettingsView.vue
index 9686001..99637b9 100644
--- a/src/views/SettingsView.vue
+++ b/src/views/SettingsView.vue
@@ -6,6 +6,7 @@ import {
   Home,
   Info,
   LogOut,
+  Settings,
   Shield,
   User as UserIcon,
 } from 'lucide-vue-next'
@@ -26,6 +27,7 @@ interface SettingSection {
 const sections: SettingSection[] = [
   { icon: UserIcon, label: '帳號', to: '/settings/account' },
   { icon: Bell, label: '通知', to: '/settings/notifications' },
+  { icon: Settings, label: '調整設置', to: '/settings/preferences' },
   { icon: Bluetooth, label: 'Probe 連接', to: '/probe' },
   { icon: Shield, label: '資料與隱私', to: '/settings/privacy' },
   { icon: Info, label: '關於 MotoVerify', to: '/settings/about' },
```

</details>

#### 結果
已提交 commit 4d6ff04

#### 時數
0.1

---

### 車輛封面照改為直接覆蓋取代，並清理舊檔案節省 Storage 空間 `aeab1d8`

- 使用者：Archi
- 時間：2026-09-08 02:49
- 分類：前台
- 類型：修復

#### Prompt
[Request interrupted by user for tool use]

#### 摘要
- VehiclePhotoGallery.vue：「新增照片」按鈕本來就長在封面照上，語意上
  應該是換封面，但原本是把新照片加到縮圖列尾端，不會更新封面。改成
  一律取代封面（photos[0]），縮圖列維持只能檢視/刪除既有照片，不再
  提供「設為封面」功能——封面只會有一張，不會被縮圖覆蓋。
- 封面被取代、照片被重新裁切、縮圖被刪除時，舊檔案現在都會一併從
  Firebase Storage 刪除（storage.service.ts 新增 deleteFileAtUrl），
  避免累積用不到的孤兒檔案。
- PhotoLightbox.vue 新增 localFile 模式：新增照片時直接對本機挑選的
  檔案進行裁切，裁切完成才上傳，不再是先上傳原圖、之後才手動裁切。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/components/common/PhotoLightbox.vue b/src/components/common/PhotoLightbox.vue
index 8de6f22..b9b2721 100644
--- a/src/components/common/PhotoLightbox.vue
+++ b/src/components/common/PhotoLightbox.vue
@@ -27,17 +27,20 @@
  * uploading, and replacing the URL in its own data, and controls `uploading`
  * to keep this view showing a busy state until that finishes.
  */
-import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
+import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
 import { Check, Crop as CropIcon, Loader2, X, ZoomIn, ZoomOut } from 'lucide-vue-next'
 
+/** Either an already-uploaded photo (view-first, crop is opt-in via the
+ *  "裁切" button) or a not-yet-uploaded local File (skips straight to crop —
+ *  there's nothing to "view" yet, the caller hasn't uploaded anything). */
 const props = withDefaults(
-  defineProps<{ imageUrl: string; uploading?: boolean; aspectRatio?: number }>(),
+  defineProps<{ imageUrl?: string; localFile?: File; uploading?: boolean; aspectRatio?: number }>(),
   { aspectRatio: 1 },
 )
 const emit = defineEmits<{ close: []; cropConfirmed: [Blob] }>()
 
 type Mode = 'view' | 'loading-crop' | 'crop' | 'error'
-const mode = ref<Mode>('view')
+const mode = ref<Mode>(props.localFile ? 'loading-crop' : 'view')
 const errorMessage = ref('')
 
 let bitmap: ImageBitmap | null = null
@@ -106,20 +109,31 @@ async function enterCropMode(): Promise<void> {
   mode.value = 'loading-crop'
   errorMessage.value = ''
   try {
-    // `cache: 'no-store'` is required, not just an optimization — this image
-    // was almost always already shown via a plain `<img>` tag (view mode,
-    // gallery thumbnails), which primes the browser's disk cache. A default
-    // fetch() then revalidates against that cache entry; Chromium has a bug
-    // where a 304 revalidation response loses its Access-Control-Allow-Origin
-    // header on the way back to fetch(), so the CORS check fails even though
-    // the real server response always carries the header (confirmed via
-    // curl). Forcing a full re-fetch every time sidesteps the 304 path
-    // entirely instead of depending on a Chromium fix.
-    const response = await fetch(props.imageUrl, { cache: 'no-store' })
-    if (!response.ok) throw new Error(`fetch failed: ${response.status}`)
-    const sourceBlob = await response.blob()
+    let sourceBlob: Blob
+    if (props.localFile) {
+      sourceBlob = props.localFile
+    } else {
+      // `cache: 'no-store'` is required, not just an optimization — this image
+      // was almost always already shown via a plain `<img>` tag (view mode,
+      // gallery thumbnails), which primes the browser's disk cache. A default
+      // fetch() then revalidates against that cache entry; Chromium has a bug
+      // where a 304 revalidation response loses its Access-Control-Allow-Origin
+      // header on the way back to fetch(), so the CORS check fails even though
+      // the real server response always carries the header (confirmed via
+      // curl). Forcing a full re-fetch every time sidesteps the 304 path
+      // entirely instead of depending on a Chromium fix.
+      const response = await fetch(props.imageUrl!, { cache: 'no-store' })
+      if (!response.ok) throw new Error(`fetch failed: ${response.status}`)
+      sourceBlob = await response.blob()
+    }
     cleanupBitmap()
-    bitmap = await createImageBitmap(sourceBlob)
+    // A local file is a fresh camera-roll pick, still carrying its original
+    // EXIF orientation — `imageOrientation: 'from-image'` bakes that into the
+    // decode so the preview (and resulting crop) isn't sideways. An
+    // already-uploaded photo went through image-compression.service.ts on
+    // its way in, which already applied this, so re-applying it here would
+    // be a no-op either way.
+    bitmap = await createImageBitmap(sourceBlob, { imageOrientation: 'from-image' })
     previewObjectUrl = URL.createObjectURL(sourceBlob)
     previewUrl.value = previewObjectUrl
     naturalSize.width = bitmap.width
@@ -142,7 +156,17 @@ async function enterCropMode(): Promise<void> {
   }
 }
 
+onMounted(() => {
+  if (props.localFile) void enterCropMode()
+})
+
 function cancelCrop(): void {
+  // A local file never had a "view" state to fall back to — there's nothing
+  // uploaded yet, so cancelling means abandoning the pick entirely.
+  if (props.localFile) {
+    emit('close')
+    return
+  }
   mode.value = 'view'
   cleanupBitmap()
 }
diff --git a/src/components/vehicle/VehiclePhotoGallery.vue b/src/components/vehicle/VehiclePhotoGallery.vue
index 25655ff..ef6040f 100644
--- a/src/components/vehicle/VehiclePhotoGallery.vue
+++ b/src/components/vehicle/VehiclePhotoGallery.vue
@@ -2,12 +2,16 @@
 /**
  * 車輛詳情's own photo gallery — cover photo (always `photos[0]`, matching
  * VehicleDetailView's pre-existing "hero = photos[0]" convention) plus a
- * thumbnail row for the rest. Tapping a thumbnail promotes it to cover by
- * reordering the array; there is no separate "cover" flag on the Vehicle
- * doc, index 0 IS the cover.
+ * thumbnail row for the rest (view/delete only — a leftover of a removed
+ * "add to gallery" path, kept so vehicles that already have extra photos
+ * don't lose them). The "新增照片" button lives on the cover banner and
+ * always replaces the cover — never appends a thumbnail — so a vehicle only
+ * ever has exactly one cover; the old cover file is deleted from Storage
+ * once the replacement is saved, same as re-cropping and deleting a photo
+ * below both clean up their own old file.
  */
 import { computed, ref } from 'vue'
-import { Bike, Plus, Star, Trash2 } from 'lucide-vue-next'
+import { Bike, Plus, Trash2 } from 'lucide-vue-next'
 import PhotoLightbox from '@/components/common/PhotoLightbox.vue'
 import { storageService } from '@/services/firebase/storage.service'
 import { imageCompressionService } from '@/services/media/image-compression.service'
@@ -19,6 +23,7 @@ const vehicleStore = useVehicleStore()
 const uploading = ref(false)
 const fileInput = ref<HTMLInputElement | null>(null)
 const activePhotoUrl = ref<string | null>(null)
+const pendingFile = ref<File | null>(null)
 // Matches wherever the photo actually displays — the cover banner reads as
 // roughly 16:9 (fixed 200px height across a mobile-width card), thumbnails
 // are perfect 1:1 squares — so the crop frame always produces a shape that
@@ -33,35 +38,38 @@ function triggerAdd(): void {
   fileInput.value?.click()
 }
 
-async function handleFileChange(event: Event): Promise<void> {
+function handleFileChange(event: Event): void {
   const input = event.target as HTMLInputElement
   const file = input.files?.[0]
   input.value = ''
   if (!file) return
+  // Crop happens before anything is uploaded. PhotoLightbox opens straight
+  // into crop mode for a local File (see its `localFile` prop); the frame is
+  // always the 16:9 cover shape since this always targets the cover slot.
+  activePhotoAspect.value = 16 / 9
+  pendingFile.value = file
+}
+
+async function handleNewPhotoCropConfirmed(blob: Blob): Promise<void> {
+  const oldCover = cover.value
   uploading.value = true
   try {
-    // Same resize/re-encode as verification evidence / marketplace listing
-    // photos — always re-encodes to JPEG, so the stored extension follows
-    // the actual bytes rather than the original file's (possibly different)
-    // extension.
-    const { blob } = await imageCompressionService.compressImage(file)
-    const url = await storageService.uploadVehiclePhoto(props.vehicleId, blob, 'jpg')
-    await vehicleStore.updateVehicle(props.vehicleId, { photos: [...props.photos, url] })
+    const { blob: compressed } = await imageCompressionService.compressImage(blob)
+    const url = await storageService.uploadVehiclePhoto(props.vehicleId, compressed, 'jpg')
+    await vehicleStore.updateVehicle(props.vehicleId, { photos: [url, ...thumbnails.value] })
+    pendingFile.value = null
+    if (oldCover) await storageService.deleteFileAtUrl(oldCover)
   } finally {
     uploading.value = false
   }
 }
 
-async function setCover(url: string): Promise<void> {
-  const next = [url, ...props.photos.filter((photo) => photo !== url)]
-  await vehicleStore.updateVehicle(props.vehicleId, { photos: next })
-}
-
 async function removePhoto(url: string): Promise<void> {
   if (!window.confirm('刪除這張照片？此操作無法復原。')) return
   await vehicleStore.updateVehicle(props.vehicleId, {
     photos: props.photos.filter((photo) => photo !== url),
   })
+  await storageService.deleteFileAtUrl(url)
 }
 
 function openPhoto(url: string, aspect: number): void {
@@ -84,6 +92,7 @@ async function handleCropConfirmed(blob: Blob): Promise<void> {
     const nextPhotos = props.photos.map((photo) => (photo === originalUrl ? newUrl : photo))
     await vehicleStore.updateVehicle(props.vehicleId, { photos: nextPhotos })
     activePhotoUrl.value = null
+    await storageService.deleteFileAtUrl(originalUrl)
   } finally {
     replacingPhoto.value = false
   }
@@ -98,16 +107,13 @@ async function handleCropConfirmed(blob: Blob): Promise<void> {
         <Bike :size="56" color="var(--color-text-disabled)" />
       </div>
       <button class="add-btn" :disabled="uploading" @click="triggerAdd">
-        <Plus :size="14" />{{ uploading ? '上傳中...' : '新增照片' }}
+        <Plus :size="14" />{{ uploading ? '上傳中...' : cover ? '更換封面' : '新增照片' }}
       </button>
     </div>
 
     <div v-if="thumbnails.length > 0" class="thumb-row">
       <div v-for="photo in thumbnails" :key="photo" class="thumb">
         <img :src="photo" class="thumb-img" alt="" @click="openPhoto(photo, 1)" />
-        <button class="thumb-btn cover-btn" aria-label="設為封面" @click="setCover(photo)">
-          <Star :size="11" />
-        </button>
         <button class="thumb-btn delete-btn" aria-label="刪除照片" @click="removePhoto(photo)">
           <Trash2 :size="11" />
         </button>
@@ -123,7 +129,16 @@ async function handleCropConfirmed(blob: Blob): Promise<void> {
     />
 
     <PhotoLightbox
-      v-if="activePhotoUrl"
+      v-if="pendingFile"
+      :local-file="pendingFile"
+      :aspect-ratio="activePhotoAspect"
+      :uploading="uploading"
+      @close="pendingFile = null"
+      @crop-confirmed="handleNewPhotoCropConfirmed"
+    />
+
+    <PhotoLightbox
+      v-else-if="activePhotoUrl"
       :image-url="activePhotoUrl"
       :aspect-ratio="activePhotoAspect"
       :uploading="replacingPhoto"
@@ -218,10 +233,6 @@ async function handleCropConfirmed(blob: Blob): Promise<void> {
   color: #fff;
 }
 
-.cover-btn {
-  left: 2px;
-}
-
 .delete-btn {
   right: 2px;
 }
diff --git a/src/services/firebase/storage.service.ts b/src/services/firebase/storage.service.ts
index 83ef738..c04fc8e 100644
--- a/src/services/firebase/storage.service.ts
+++ b/src/services/firebase/storage.service.ts
@@ -1,4 +1,4 @@
-import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
+import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
 
 import { storage } from './firebase'
 
@@ -6,6 +6,20 @@ function timestampedName(fileName: string): string {
   return `${Date.now()}-${fileName}`
 }
 
+/** Deletes a previously-uploaded public file by its download URL (as
+ *  returned by uploadFileAtPath/uploadVehiclePhoto etc). Swallows
+ *  "already gone" so a stale reference or a race with another delete never
+ *  surfaces as a user-facing failure — the caller's own Firestore update is
+ *  the source of truth either way. */
+async function deleteFileAtUrl(url: string): Promise<void> {
+  try {
+    await deleteObject(ref(storage, url))
+  } catch (error) {
+    const code = (error as { code?: string }).code
+    if (code !== 'storage/object-not-found') throw error
+  }
+}
+
 /**
  * Public content — marketplace listing photos, discussion post images. The
  * returned value IS the permanent download URL, persisted directly into
@@ -93,6 +107,7 @@ export const storageService = {
   uploadFileAtPath,
   uploadPrivateFile,
   resolveDownloadUrl,
+  deleteFileAtUrl,
   uploadEvidenceFile,
   uploadChatImage,
   uploadDiscussionImage,
```

</details>

#### 結果
已提交 commit aeab1d8

#### 時數
1.1

---

### 驗車進度新增「基本13項健檢」入口 `511d29a`

- 使用者：Archi
- 時間：2026-09-08 02:49
- 分類：檢定辨識
- 類型：功能

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
- 新增 BasicHealthCheck13.vue：從標準化 HTML 原型移植過來的點選式檢查
  清單，車輛參考圖兩頁鏡像顯示前後車身共 13 個部位，點擊項目標籤切換
  已檢查/未檢查，必填項目未完成無法翻頁，電系/其他改裝打勾後會展開
  說明欄，並有整體進度條。
- 參考圖以 JPEG 儲存（basic-health-check-photo.ts），比原本的 PNG
  小約 3.8 倍；這張圖是所有車輛共用的靜態示意圖，不會隨車輛數量增加
  而變多份。
- 目前為第一版陽春整合：狀態只存在畫面當下（未接資料庫），入口從
  VerificationHub.vue 新增一個獨立卡片進入，不影響原本以資料驅動的
  section/item 深度驗車流程。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/components/verification/BasicHealthCheck13.vue b/src/components/verification/BasicHealthCheck13.vue
new file mode 100644
index 0000000..d63d0e1
--- /dev/null
+++ b/src/components/verification/BasicHealthCheck13.vue
@@ -0,0 +1,418 @@
+<script setup lang="ts">
+/**
+ * 基本13項健檢 — a lightweight point-and-tap checklist over a reference
+ * motorcycle photo (front 3/4 view page 1, the same photo mirrored for the
+ * rear-facing items on page 2). Ported from a standalone HTML prototype;
+ * this first pass is deliberately self-contained (in-memory state only, no
+ * Firestore/AI wiring) so it can be reached from 驗車進度 without touching
+ * the deep per-item evidence/answer pipeline the rest of verification.store.ts
+ * drives — that wiring is a separate follow-up once this UI is confirmed.
+ */
+import { computed, reactive, ref } from 'vue'
+import { Check } from 'lucide-vue-next'
+
+import AppHeader from '@/components/common/AppHeader.vue'
+import PrimaryButton from '@/components/common/PrimaryButton.vue'
+import { BIKE_REFERENCE_PHOTO } from './basic-health-check-photo'
+
+const emit = defineEmits<{ back: [] }>()
+
+interface ChecklistItem {
+  key: string
+  label: string
+  /** [x%, y%] position of the feature on the reference photo. Page 2 reuses
+   *  the same photo mirrored (scaleX(-1)), so its anchors are pre-mirrored
+   *  (100 - original_x) to line up with the flipped image. */
+  anchor: [number, number]
+  page: 1 | 2
+  required: boolean
+}
+
+const ITEMS: ChecklistItem[] = [
+  { key: 'headlight', label: '大燈', anchor: [20.5, 38.0], page: 1, required: true },
+  { key: 'turnsignal', label: '方向燈', anchor: [40.0, 55.8], page: 1, required: true },
+  { key: 'electrical', label: '電系是否有改裝', anchor: [41.6, 24.0], page: 1, required: false },
+  { key: 'taillight', label: '尾燈', anchor: [85.0, 45.2], page: 1, required: true },
+  { key: 'seat', label: '坐墊外觀', anchor: [51.7, 35.7], page: 1, required: true },
+  { key: 'othermod', label: '其他改裝品', anchor: [58.4, 80.0], page: 1, required: false },
+  { key: 'triple', label: '三角台', anchor: [68.5, 53.0], page: 2, required: false },
+  { key: 'frontshock', label: '前避震', anchor: [66.8, 65.0], page: 2, required: false },
+  { key: 'frontbrake', label: '前煞車', anchor: [77.7, 79.4], page: 2, required: true },
+  { key: 'fronttire', label: '前輪', anchor: [70.0, 90.0], page: 2, required: false },
+  { key: 'rearbrake', label: '後煞車', anchor: [24.8, 60.4], page: 2, required: true },
+  { key: 'reartire', label: '後輪', anchor: [20.0, 77.0], page: 2, required: false },
+  { key: 'rearshock', label: '後避震', anchor: [20.1, 45.8], page: 2, required: false },
+]
+
+interface NoteItem {
+  key: string
+  label: string
+  placeholder: string
+}
+
+const NOTE_ITEMS: NoteItem[] = [
+  {
+    key: 'electrical',
+    label: '電系改裝說明（選填）',
+    placeholder: '請說明電系改裝內容，例如：加裝行車紀錄器、更換 LED 大燈組……',
+  },
+  {
+    key: 'othermod',
+    label: '其他改裝品說明（選填）',
+    placeholder: '請說明其他改裝項目，例如：更換排氣管、外殼貼膜……',
+  },
+]
+
+const state = reactive<Record<string, boolean>>(
+  Object.fromEntries(ITEMS.map((it) => [it.key, false])),
+)
+const notes = reactive<Record<string, string>>(
+  Object.fromEntries(NOTE_ITEMS.map((n) => [n.key, ''])),
+)
+
+const PAGE_COUNT = 2
+const currentPage = ref<1 | 2>(1)
+const finished = ref(false)
+
+const pageItems = computed(() => ITEMS.filter((it) => it.page === currentPage.value))
+const isMirrored = computed(() => currentPage.value === 2)
+
+const pageRequiredMet = computed(() =>
+  ITEMS.filter((it) => it.page === currentPage.value && it.required).every(
+    (it) => state[it.key],
+  ),
+)
+
+const doneCount = computed(() => ITEMS.filter((it) => state[it.key]).length)
+const progressPercent = computed(() => (doneCount.value / ITEMS.length) * 100)
+
+const activeNotes = computed(() => NOTE_ITEMS.filter((n) => state[n.key]))
+
+const allRequiredDone = computed(() => ITEMS.filter((it) => it.required).every((it) => state[it.key]))
+
+function toggle(key: string): void {
+  state[key] = !state[key]
+}
+
+function goPage(delta: number): void {
+  const next = currentPage.value + delta
+  if (next < 1 || next > PAGE_COUNT) return
+  if (delta > 0 && !pageRequiredMet.value) return
+  currentPage.value = next as 1 | 2
+}
+
+function finish(): void {
+  finished.value = true
+}
+</script>
+
+<template>
+  <div>
+    <AppHeader title="基本13項健檢" back custom-back @back="emit('back')" />
+
+    <div class="content">
+      <p class="intro">點擊車輛照片上的項目標籤，即可標示已檢查／未檢查，並確認左右兩側外觀角度。</p>
+
+      <div class="bike-card">
+        <div class="bike-img-wrap" :class="{ mirrored: isMirrored }">
+          <div class="bike-photo">
+            <img :src="BIKE_REFERENCE_PHOTO" class="bike-illustration" alt="車輛參考圖" />
+          </div>
+          <button
+            v-for="it in pageItems"
+            :key="it.key"
+            class="chip"
+            :class="[
+              it.anchor[0] < 50 ? 'side-left' : 'side-right',
+              { required: it.required && !state[it.key], checked: state[it.key] },
+            ]"
+            :style="{ left: it.anchor[0] + '%', top: it.anchor[1] + '%' }"
+            @click="toggle(it.key)"
+          >
+            <span class="dot"><Check v-if="state[it.key]" :size="11" /></span>
+            <span class="label">{{ it.label }}</span>
+          </button>
+        </div>
+
+        <div class="page-nav">
+          <button :disabled="currentPage === 1" aria-label="上一頁" @click="goPage(-1)">‹</button>
+          <span class="count">{{ currentPage }} / {{ PAGE_COUNT }}</span>
+          <button :disabled="currentPage === PAGE_COUNT || !pageRequiredMet" aria-label="下一頁" @click="goPage(1)">›</button>
+        </div>
+        <p v-if="currentPage < PAGE_COUNT && !pageRequiredMet" class="required-hint">
+          請先完成本頁標示的必填項目，才能前往下一頁
+        </p>
+      </div>
+
+      <div class="progress-card">
+        <div class="progress-head">
+          <span>檢查進度</span>
+          <span class="progress-count">{{ doneCount }}<span class="of">/{{ ITEMS.length }}</span></span>
+        </div>
+        <div class="progress-track">
+          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
+        </div>
+      </div>
+
+      <div v-if="activeNotes.length > 0" class="notes-wrap">
+        <div v-for="n in activeNotes" :key="n.key" class="note-card">
+          <label>{{ n.label }}</label>
+          <textarea v-model="notes[n.key]" :placeholder="n.placeholder" />
+        </div>
+      </div>
+    </div>
+
+    <div class="bottom-bar">
+      <PrimaryButton v-if="!finished" block :disabled="!allRequiredDone" @click="finish">
+        完成基本13項健檢
+      </PrimaryButton>
+      <template v-else>
+        <p class="done-message">已完成基本13項健檢 ✓</p>
+        <PrimaryButton block @click="emit('back')">回到驗車進度</PrimaryButton>
+      </template>
+    </div>
+  </div>
+</template>
+
+<style scoped>
+.content {
+  padding: var(--space-md);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-md);
+  padding-bottom: 100px;
+}
+
+.intro {
+  font-size: 12.5px;
+  color: var(--color-text-secondary);
+  margin: 0;
+}
+
+.bike-card {
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  padding: var(--space-md);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-sm);
+}
+
+.bike-img-wrap {
+  position: relative;
+  width: 100%;
+  /* Matches the reference photo's own aspect ratio — a fixed inset box
+     (8% margin all round) keeps the bike a bit smaller than the card
+     instead of filling it edge-to-edge. */
+  padding-top: 118.96%;
+  border-radius: var(--radius-md);
+  overflow: hidden;
+  background: var(--color-background);
+}
+
+.bike-photo {
+  position: absolute;
+  left: 8%;
+  top: 8%;
+  width: 84%;
+  height: 84%;
+}
+
+.bike-illustration {
+  position: absolute;
+  inset: 0;
+  width: 100%;
+  height: 100%;
+  object-fit: contain;
+}
+
+.bike-img-wrap.mirrored .bike-illustration {
+  transform: scaleX(-1);
+}
+
+.chip {
+  position: absolute;
+  display: flex;
+  align-items: center;
+  gap: 5px;
+  background: transparent;
+  border: none;
+  padding: 0;
+  cursor: pointer;
+  white-space: nowrap;
+  transform: translate(-50%, -50%);
+  z-index: 2;
+}
+
+.chip.side-left {
+  flex-direction: row-reverse;
+}
+
+.dot {
+  width: 22px;
+  height: 22px;
+  border-radius: 50%;
+  background: #fff;
+  border: 1.5px solid var(--color-border);
+  color: var(--color-primary);
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  flex-shrink: 0;
+  box-shadow: 0 2px 6px rgba(20, 24, 31, 0.3);
+}
+
+.chip.required .dot {
+  background: var(--color-warning-bg);
+  border-color: var(--color-warning);
+}
+
+.chip.checked .dot {
+  background: var(--color-primary);
+  border-color: var(--color-primary);
+  color: #fff;
+}
+
+.label {
+  font-size: 11px;
+  font-weight: 800;
+  color: #14181f;
+  text-shadow:
+    0 0 4px #fff,
+    0 0 4px #fff,
+    0 0 4px #fff;
+}
+
+.page-nav {
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  gap: var(--space-md);
+}
+
+.page-nav button {
+  width: 28px;
+  height: 28px;
+  border-radius: 50%;
+  border: 1.5px solid var(--color-border);
+  background: var(--color-surface);
+  color: var(--color-text-secondary);
+  font-size: 16px;
+  line-height: 1;
+}
+
+.page-nav button:disabled {
+  opacity: 0.3;
+}
+
+.page-nav .count {
+  font-size: 12px;
+  font-weight: 800;
+  color: var(--color-text-secondary);
+  min-width: 34px;
+  text-align: center;
+}
+
+.required-hint {
+  text-align: center;
+  font-size: 11.5px;
+  font-weight: 700;
+  color: var(--color-warning);
+  margin: 0;
+}
+
+.progress-card {
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  padding: var(--space-md);
+}
+
+.progress-head {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+  margin-bottom: var(--space-sm);
+  font-size: 13px;
+  font-weight: 700;
+}
+
+.progress-count {
+  color: var(--color-primary);
+}
+
+.progress-count .of {
+  color: var(--color-text-secondary);
+  font-weight: 600;
+}
+
+.progress-track {
+  height: 6px;
+  border-radius: 999px;
+  background: var(--color-background);
+  overflow: hidden;
+}
+
+.progress-fill {
+  height: 100%;
+  border-radius: 999px;
+  background: var(--color-primary);
+  transition: width 0.2s ease;
+}
+
+.notes-wrap {
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-sm);
+}
+
+.note-card {
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+  padding: var(--space-md);
+}
+
+.note-card label {
+  display: block;
+  font-size: 12px;
+  font-weight: 800;
+  margin-bottom: 6px;
+}
+
+.note-card textarea {
+  width: 100%;
+  min-height: 56px;
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-sm);
+  padding: 8px 10px;
+  font-family: inherit;
+  font-size: 12px;
+  color: var(--color-text-primary);
+  background: var(--color-background);
+  resize: vertical;
+  box-sizing: border-box;
+}
+
+.bottom-bar {
+  position: fixed;
+  left: 0;
+  right: 0;
+  bottom: 0;
+  padding: var(--space-md);
+  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom));
+  background: var(--color-surface);
+  border-top: 1px solid var(--color-border);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-sm);
+}
+
+.done-message {
+  text-align: center;
+  font-weight: 700;
+  color: var(--color-success);
+  margin: 0;
+}
+</style>
diff --git a/src/components/verification/VerificationHub.vue b/src/components/verification/VerificationHub.vue
index 55f9379..2e10ea1 100644
--- a/src/components/verification/VerificationHub.vue
+++ b/src/components/verification/VerificationHub.vue
@@ -1,5 +1,5 @@
 <script setup lang="ts">
-import { Check, Circle, Loader2, Lock } from 'lucide-vue-next'
+import { Check, Circle, ClipboardCheck, ChevronRight, Loader2, Lock } from 'lucide-vue-next'
 
 import PrimaryButton from '@/components/common/PrimaryButton.vue'
 import type { MissingRequiredItem, SectionProgress } from '@/stores/verification.store'
@@ -17,7 +17,12 @@ const props = defineProps<{
   completing: boolean
 }>()
 
-const emit = defineEmits<{ selectSection: [string]; complete: []; retryAnalysis: [string] }>()
+const emit = defineEmits<{
+  selectSection: [string]
+  complete: []
+  retryAnalysis: [string]
+  openBasicHealthCheck: []
+}>()
 
 // Human labels for Verification.analysisStatus's route keys (see
 // functions/src/services/analysis-status.service.ts's AnalysisRouteKey) —
@@ -91,6 +96,17 @@ const canSubmit = () =>
     <h2>驗車進度</h2>
     <p class="hint">選擇一個車輛部位開始拍攝</p>
 
+    <button class="basic-check-row" @click="emit('openBasicHealthCheck')">
+      <div class="basic-check-icon">
+        <ClipboardCheck :size="20" color="var(--color-primary)" />
+      </div>
+      <div class="basic-check-info">
+        <span class="basic-check-title">基本13項健檢</span>
+        <span class="basic-check-desc">點擊車輛照片上的項目，快速標示已檢查外觀部位</span>
+      </div>
+      <ChevronRight :size="18" color="var(--color-text-disabled)" />
+    </button>
+
     <div class="section-grid">
       <button
         v-for="section in sections"
@@ -148,6 +164,10 @@ const canSubmit = () =>
 <style scoped>
 .verification-hub {
   padding: var(--space-md);
+  /* This screen has no AppHeader ancestor (it fully replaces the step flow's
+     header while open), so it needs its own top inset — without it, the
+     h2 sits flush under the status bar/notch on iOS. */
+  padding-top: calc(var(--space-md) + env(safe-area-inset-top));
   display: flex;
   flex-direction: column;
   gap: var(--space-sm);
@@ -164,6 +184,47 @@ const canSubmit = () =>
   margin: 0 0 var(--space-sm);
 }
 
+.basic-check-row {
+  display: flex;
+  align-items: center;
+  gap: var(--space-md);
+  padding: var(--space-md);
+  border-radius: var(--radius-lg);
+  border: 1px solid var(--color-primary);
+  background: var(--color-primary-bg);
+  text-align: left;
+}
+
+.basic-check-icon {
+  width: 40px;
+  height: 40px;
+  flex-shrink: 0;
+  border-radius: var(--radius-md);
+  background: var(--color-surface);
+  display: flex;
+  align-items: center;
+  justify-content: center;
+}
+
+.basic-check-info {
+  flex: 1;
+  min-width: 0;
+  display: flex;
+  flex-direction: column;
+  gap: 2px;
+}
+
+.basic-check-title {
+  font-size: 14.5px;
+  font-weight: 700;
+  color: var(--color-text-primary);
+}
+
+.basic-check-desc {
+  font-size: 12px;
+  color: var(--color-text-secondary);
+}
+
 .section-grid {
   display: grid;
   grid-template-columns: repeat(2, 1fr);
diff --git a/src/components/verification/basic-health-check-photo.ts b/src/components/verification/basic-health-check-photo.ts
new file mode 100644
index 0000000..dee1c03
--- /dev/null
+++ b/src/components/verification/basic-health-check-photo.ts
@@ -0,0 +1,10 @@
+/** Reference motorcycle photo used by BasicHealthCheck13.vue's point-and-tap
+ *  checklist (front 3/4 view; page 2 mirrors this same image for the
+ *  rear-facing items). Kept as its own module so the large data URI doesn't
+ *  clutter the component file. Stored as JPEG (not the original PNG) since
+ *  it's a photograph — lossless PNG encoding was ~4x larger for the same
+ *  visible quality (114KB vs 27KB). This is a single shared static asset
+ *  bundled once with the app, not per-vehicle, so it does not grow with
+ *  the number of vehicles in the system. */
+export const BIKE_REFERENCE_PHOTO =
+  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABDaADAAQAAAABAAABQAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgBQAENAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAQEBAQEBAgEBAgMCAgIDBAMDAwMEBgQEBAQEBgcGBgYGBgYHBwcHBwcHBwgICAgICAkJCQkJCwsLCwsLCwsLC//bAEMBAgICAwMDBQMDBQsIBggLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLC//dAAQAEf/aAAwDAQACEQMRAD8A/v4ooooAKKKKACiiigAoory7Svjh8GNd1248MaL4t0e71K0kMM1rDfQvNHIpwUZA5IYHgjqDRYD1Gimh1YAg8HpTqACiiigAooooAKKKKACiiigAooooAKK83+KHxh+FfwU8MyeMvi54hsPDmlxdbnUJ0gTPoCxG4+wya/Df9pL/AIOK/wBkn4ULcaf8G9K1Hx5eRcLcAf2fYE+vmTDzGH+7EQfWmk2B/QhRX+f58Zf+DoT9tbxT4strP4XadoHhrTzdRgQwW7XcjruA2tNM3Q99sa5HcV/ah+wp+0B4l/an/ZE8AftA+MtNTSNV8UaTHeXVrHny1l3MjNHu58uQrvTJJ2sOTQ1YD6zooopAFFFFABRRRQAUUUUAFFFFAH//0P7+KKKKACiiigAooooA5bxzpGp+IPBWsaDoly1le31lcW9vcIcNFLLGyo491Ygj6V/ksa54t+IPwU8cXsmi3NxpN3aXUlteRxtt8u6iYo4ZeQdzKxBIznIJzX+uhX+b5/wXB/ZD1v4Ef8FAfGc2kaft0LxjJ/wkFoWPlwyRX53TqCcAeXciQfKTtyp4yKL2KWzLP7I//Bav9qj4WXln4aj8Q3DRHCRB3822JA6PBLvTB6ZTBHtX9rX/AATG/bnl/bq+BV3401+0gsfEGg6g2nahFbgrFJlFlhmRGZigdGwVLHDK2OMV/ljzzyeB/FcMUswkSKVWjdTnPPQ4/iHQ9PXpX9iX/BsX+0NYa18efH/wf0+V5E1XQIdUZRyqyafcCME4JA3LckZ74q3rqSf2jUUUVABRRRQAUUUUAFFFFABX4l/8Fif+CqEX7B3gmx+HHwpmtZ/iV4ljM1uJ1EqabYglTdSRkgO7sCkCN8pYMzZVCrftbdTC3t3nYFgiliFGSQBnj39K/wAm39ub9srxX+1N+0f4w+O3i+58q98QX0jxRTsSLKziPl21sqj/AJ4wqikDgvuY8saaGjrv2h/2w/iN8VfEUvjn4z+Jr/xFrEudst7MZpB1O2NeFjXnoioo9K/P7xZ8Qdd8UyM11I0Vvn5Ygev+8e9cfdah4cvb1r2+1Ka4lb7zeXnn8TVC+1fw8MQWbTzuxCKoUZZjwAAOck9up7VTE5H0D+yh8EvFX7SP7Q3hX4MeD4zJqPiPU7bToMLuCPcuE3nHRY03SMewQ1/r4fC/4e+HfhL8N9A+F3hGIQ6V4c0+20yzQADbBaxrEnTvhRn3r+PL/g2k/wCCVXxj+HHjq4/bh/aZ8KXXhdIbF7fwlY6oghvZXvV2zXrwMBJEiw/uovMCs/mO20LtJ/tHqWJeYUUUUhhRRRQAUUUUAFFFFABRRRQB/9H+/iiiigAooooAKKKKACvmv9qT9kb4Bftk/DeX4XfH/QYtYsDue2nH7u7spmGPNt5h88T4644YcMGXivpSigLn+fD/AMFI/wDg19/bE8OxSav+xne2nxC0c3Pm/Y5p49O1dIAThCshWCUgEAskiFsZ2DpX6Mf8G637Nnjj9gz48eKPgV+2V4Un8KfFHxR4dtLjw3c3lxHKt9o1vK8lzbwGEvHvhkeNpo/NZ04BUDaz/wBg1fAv/BRr9nxvjR+zzfeNvB97/Yfj/wCGyzeKfCGtKPnstTsI2kCvjlre4RTDcJ/FG2R8yqQDPvqivm39jv47y/tPfsrfD39oS6sxp1z4x8P6fq1xaK28W89zCryxZ4zscsvrxX0lQIKKKKACiiigAoor4A/4KZftO/Er9lT9lLUfGfwO0+21T4geINR03wx4Wt7w4tv7W1m4S2hlm9Y4AzTOvVhHtHJFAHhP/BTz/goZqn7O2lW37Lv7LOjSfEL9obx/ayReGvC9h+8ktIGBWTUr0hlWC2hUkq0rxrI4xuVQ7p/Jvd/8GlH7e2o/C2Hxbc/EDwk3i6VY5JdElku/KRWQFla+ERRpVbg4h2Mctu9f7Jf2Af8Agnj4M/Yv0bWPHHinV7jx98XPG7i78Y+N9UAa/wBTuevlx9oLSI8Q26YVVAzkgY/RigZ/nQ/s8/8ABpN+3P478XmD9orxb4e8CaBA6iSaxmbWbyYZB/dRIsEYGMjMsowf4TX9an7BP/BDL9gL9gGez8WeAfDR8UeM7UBh4l8RlL29jk7tbptWC25zgwxh8HBY1+xVFAhAMUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/S/v4ooooAKKKKACiiigAooooAK/Jb/gu1dPaf8EiPjzMkhiJ8Nsm4EqfnmiXqCOuce9frTX5df8FM/CPwj/aE+Et7+zP8Z/Fmq+G/CuqLFLrcWjTW9vcahbglhavJPBO0cTMquxiCSEqBu27gRjSPy2/4NRvi+/jr9hjxf4CuZvNl8N+K5ZVXOSkOo28Ug/AyJJ+Oa/og+OX7Qnwv/Z48FXXjv4m6gLOztULbVG6RyP4VHc1/J7+zT+wT+yz+x14y1T40fs5fHr4jaV4O0+6stQ1jw2t5Z29jqMcExeK1ubiCKK4lVyGXgK5j3gttLZ+TP2vf2sviF+318VtU0k3E0Pg/w9bNf6kYTtCWofZHGvYS3MpEUf8AdG9+iVcYti6XPuL4+/8AB0F4o8PeKfsXwP8AhZaT6Os5VLvWNQkM9xCpILiKCLYgYghT5r9M4r6P+B3/AAcs/CvxrbRx/FL4Ya3pc2QHk0i5hv0PTkJKYH/AbjX8XXxR1BJPFMyOEUl/uR8IgHAVR2VQAFHoBXsXwu+MXw9+GM1o3iKOXULyT5rfTbJFlu58dSAxCIg/ikkZUUdz0rX2avYi7P8AQV8Cf8Fj/wDgnp40lhsdV8dp4TvJgCsHia0uNI69vMuI1hJ/3ZDX6E+CviX8O/iTpo1n4d67p+v2ZAIn066juoyD0+aJmFf50V5+3t8RtR0CbQ7PRdL061uIzEln5K36RJjq8twpEsh7ssUca/wKfvV8m6B44+JPg3xb/wAJt8ObhtAv8llk04fZSCTnjySmPwIpSpRvowTfVH+qJvQHBIzX8KP/AAdk/GK7T9q/4HfCDTb2WP8Asvw9rGtSRRSsiiW7mjjhchSBuX7MxRsZU8qQa8A8Mf8ABXn/AIKS+F/AzeFtE8a3UNxEFePU5Ct1PEqdQ630d1CyEcHdtx1DCvxV/bo/ab+KX7Y3xdtPjn8dfHyeL/GGm6bHpEMlrplvBbpbQtIyoXgKw9ZZC+xHYs3VQABm4W6l3sf6uP7N+vv4r/Z58CeKZJPObU/Dul3RkJJ3Ga2jcnJJJzn1r2iv4Kf+CYv/AAcP/tPJ8bvg5+yL8WNL8OR/D5DZ+HbvUVtZ/wC0IrVITBBKZBMsQKyeSJD5RG3ccdx/eopJXnrSlGwJjqKKKkAooooAKKKKACiiigAooooAKKKKACiiigD/0/7
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 511d29a

#### 時數
0

---

### 新增站內通知中心，涵蓋訊息、市場、討論區與系統廣播 `6781214`

- 使用者：Archi
- 時間：2026-09-08 22:18
- 分類：系統
- 類型：功能

#### Prompt
push到firebase上面去

#### 摘要
- 新增通知資料模型（src/types/notification.ts）與前端 service/store，
  首頁鈴鐺圖示接上真正的通知列表（/notifications），未讀有紅點提示
- 新增 9 個 Firestore 觸發式 Cloud Functions（這個專案第一次用觸發式
  而非 callable 的 Functions）：訊息、收藏、預約、留言、回覆、按讚、
  管理員發文、精選文章、車訊新知，全部寫入 users/{uid}/notifications
- firestore.rules 新增 notifications 子集合（僅擁有者可讀、只能切換
  read 欄位，寫入僅限 Cloud Functions）與 systemAnnouncements 集合
  （admin-only，廣播用）

同時補齊三個原本缺少的底層功能，讓上面的通知類型真的有東西可觸發：
- 討論區留言支援「回覆」，顯示「回覆 @xxx」，UI 加上回覆輸入提示列
- 管理員可將文章「設為精選」（discussionService.setFeatured）
- 管理員發布的文章與列表卡片顯示「官方」標記（比對 authorId 是否為
  admin-auth.service.ts 的 ADMIN_UID，未新增額外欄位）
- 後台新增「系統通知」頁面，可廣播訊息給所有使用者
  （systemAnnouncements，觸發 Cloud Function 扇出通知）

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/firestore.rules b/firestore.rules
index e851e8b..1ad7df9 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -400,6 +400,16 @@ service cloud.firestore {
       match /favoriteListings/{listingId} {
         allow read, create, delete: if signedIn() && myUid() == userId;
       }
+
+      // Written only by Cloud Functions Firestore triggers (Admin SDK,
+      // bypasses these rules) — see functions/src/functions/notifications/.
+      // The client may read its own feed and flip `read`, nothing else.
+      match /notifications/{notificationId} {
+        allow read: if signedIn() && myUid() == userId;
+        allow update: if signedIn() && myUid() == userId
+          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
+        allow create, delete: if false;
+      }
     }
 
     // --- accountIds/{accountId} + publicProfiles/{accountId} ---
@@ -538,6 +548,14 @@ service cloud.firestore {
       allow write: if isAdmin();
     }
 
+    // Admin broadcast composer (src/admin/sections' 系統通知) — creating a
+    // doc here fans out a `system` notification to every user via
+    // functions/src/functions/notifications/on-system-announcement-created.ts.
+    // No update/delete UI exists; history stays admin-readable only.
+    match /systemAnnouncements/{document=**} {
+      allow read, write: if isAdmin();
+    }
+
     // Admin-editable Gemini prompt overrides (see
     // functions/src/services/prompt-config.service.ts). Read-gated to admin
     // only — unlike vehicleModels/vehicleNews this isn't reference content
diff --git a/functions/src/functions/notifications/on-appointment-created.ts b/functions/src/functions/notifications/on-appointment-created.ts
new file mode 100644
index 0000000..ca8541f
--- /dev/null
+++ b/functions/src/functions/notifications/on-appointment-created.ts
@@ -0,0 +1,35 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+
+interface ListingDoc {
+  sellerId: string
+  vehicleSnapshot: { brand: string; model: string }
+}
+
+interface AppointmentDoc {
+  buyerId: string
+  buyerName: string
+}
+
+export const onAppointmentCreated = onDocumentCreated(
+  'marketplaceListings/{listingId}/appointments/{appointmentId}',
+  async (event) => {
+    const appointment = event.data?.data() as AppointmentDoc | undefined
+    if (!appointment) return
+
+    const { listingId } = event.params
+    const db = getFirestore()
+    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
+    const listing = listingSnap.data() as ListingDoc | undefined
+    if (!listing || listing.sellerId === appointment.buyerId) return
+
+    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
+    await createNotification(listing.sellerId, {
+      type: 'booking_request',
+      title: '新的看車預約',
+      body: `${appointment.buyerName} 預約看 ${vehicleName}`,
+      link: `/marketplace/${listingId}`,
+    })
+  },
+)
diff --git a/functions/src/functions/notifications/on-discussion-comment-created.ts b/functions/src/functions/notifications/on-discussion-comment-created.ts
new file mode 100644
index 0000000..fd2c2fc
--- /dev/null
+++ b/functions/src/functions/notifications/on-discussion-comment-created.ts
@@ -0,0 +1,69 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+
+interface CommentDoc {
+  authorId: string
+  authorSnapshot: { displayName: string }
+  text: string
+  parentCommentId?: string | null
+}
+
+interface PostDoc {
+  authorId: string
+  title: string
+}
+
+/**
+ * One new comment can produce up to two DIFFERENT recipients:
+ *  - the post's author (someone commented on your post)
+ *  - the parent comment's author, if this is a reply (someone replied to
+ *    your comment)
+ * If both resolve to the same person, only the more specific "reply"
+ * notification fires — otherwise they'd get two notifications for one
+ * comment.
+ */
+export const onDiscussionCommentCreated = onDocumentCreated(
+  'discussionPosts/{postId}/comments/{commentId}',
+  async (event) => {
+    const comment = event.data?.data() as CommentDoc | undefined
+    if (!comment) return
+
+    const { postId } = event.params
+    const db = getFirestore()
+    const postSnap = await db.collection('discussionPosts').doc(postId).get()
+    const post = postSnap.data() as PostDoc | undefined
+    if (!post) return
+
+    const commenterName = comment.authorSnapshot?.displayName ?? '有人'
+    let replyRecipient: string | null = null
+
+    if (comment.parentCommentId) {
+      const parentSnap = await db
+        .collection('discussionPosts')
+        .doc(postId)
+        .collection('comments')
+        .doc(comment.parentCommentId)
+        .get()
+      const parent = parentSnap.data() as CommentDoc | undefined
+      if (parent && parent.authorId !== comment.authorId) {
+        replyRecipient = parent.authorId
+        await createNotification(parent.authorId, {
+          type: 'discussion_reply',
+          title: `${commenterName} 回覆了你的留言`,
+          body: comment.text,
+          link: `/discussion/${postId}`,
+        })
+      }
+    }
+
+    if (post.authorId !== comment.authorId && post.authorId !== replyRecipient) {
+      await createNotification(post.authorId, {
+        type: 'discussion_comment',
+        title: `${commenterName} 留言了你的文章`,
+        body: comment.text,
+        link: `/discussion/${postId}`,
+      })
+    }
+  },
+)
diff --git a/functions/src/functions/notifications/on-discussion-like-created.ts b/functions/src/functions/notifications/on-discussion-like-created.ts
new file mode 100644
index 0000000..0939f22
--- /dev/null
+++ b/functions/src/functions/notifications/on-discussion-like-created.ts
@@ -0,0 +1,28 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+
+interface PostDoc {
+  authorId: string
+  title: string
+}
+
+/** discussionPosts/{postId}/likes/{uid} — doc ID IS the liker's uid (see
+ *  discussion.service.ts's toggleLike). */
+export const onDiscussionLikeCreated = onDocumentCreated(
+  'discussionPosts/{postId}/likes/{uid}',
+  async (event) => {
+    const { postId, uid } = event.params
+    const db = getFirestore()
+    const postSnap = await db.collection('discussionPosts').doc(postId).get()
+    const post = postSnap.data() as PostDoc | undefined
+    if (!post || post.authorId === uid) return
+
+    await createNotification(post.authorId, {
+      type: 'discussion_like',
+      title: '你的文章有新的愛心',
+      body: post.title,
+      link: `/discussion/${postId}`,
+    })
+  },
+)
diff --git a/functions/src/functions/notifications/on-discussion-post-created.ts b/functions/src/functions/notifications/on-discussion-post-created.ts
new file mode 100644
index 0000000..42f5c6e
--- /dev/null
+++ b/functions/src/functions/notifications/on-discussion-post-created.ts
@@ -0,0 +1,32 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { isAdminUid } from '../../services/auth.service'
+import { broadcastNotification } from '../../services/notification.service'
+
+interface PostDoc {
+  authorId: string
+  title: string
+  status: string
+}
+
+/** A post authored by the admin account (see admin-auth.service.ts client
+ *  side — "being admin" is entirely the hardcoded uid, no separate
+ *  authorRole field exists) is announced to every user, same as vehicle
+ *  news / system broadcasts. */
+export const onDiscussionPostCreated = onDocumentCreated(
+  'discussionPosts/{postId}',
+  async (event) => {
+    const post = event.data?.data() as PostDoc | undefined
+    if (!post || !isAdminUid(post.authorId) || post.status !== 'active') return
+
+    const { postId } = event.params
+    await broadcastNotification(
+      {
+        type: 'discussion_admin_post',
+        title: '官方發布新文章',
+        body: post.title,
+        link: `/discussion/${postId}`,
+      },
+      post.authorId,
+    )
+  },
+)
diff --git a/functions/src/functions/notifications/on-discussion-post-featured.ts b/functions/src/functions/notifications/on-discussion-post-featured.ts
new file mode 100644
index 0000000..23d1910
--- /dev/null
+++ b/functions/src/functions/notifications/on-discussion-post-featured.ts
@@ -0,0 +1,30 @@
+import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
+import { broadcastNotification } from '../../services/notification.service'
+
+interface PostDoc {
+  authorId: string
+  title: string
+  featured: boolean
+}
+
+/** Fires only on the false -> true transition (an admin action — see
+ *  discussion.service.ts's setFeatured — there's no client path that flips
+ *  it back and forth repeatedly, so no debounce/guard against re-firing is
+ *  needed beyond this edge check). */
+export const onDiscussionPostFeatured = onDocumentUpdated(
+  'discussionPosts/{postId}',
+  async (event) => {
+    const before = event.data?.before.data() as PostDoc | undefined
+    const after = event.data?.after.data() as PostDoc | undefined
+    if (!before || !after) return
+    if (before.featured || !after.featured) return
+
+    const { postId } = event.params
+    await broadcastNotification({
+      type: 'discussion_featured',
+      title: '討論中心精選文章',
+      body: after.title,
+      link: `/discussion/${postId}`,
+    })
+  },
+)
diff --git a/functions/src/functions/notifications/on-favorite-created.ts b/functions/src/functions/notifications/on-favorite-created.ts
new file mode 100644
index 0000000..175208a
--- /dev/null
+++ b/functions/src/functions/notifications/on-favorite-created.ts
@@ -0,0 +1,29 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+
+interface ListingDoc {
+  sellerId: string
+  vehicleSnapshot: { brand: string; model: string }
+}
+
+/** users/{uid}/favoriteListings/{listingId} — doc ID IS the listing ID
+ *  (see listing.service.ts's addFavorite), the trigger param below matches. */
+export const onFavoriteCreated = onDocumentCreated(
+  'users/{uid}/favoriteListings/{listingId}',
+  async (event) => {
+    const { uid, listingId } = event.params
+    const db = getFirestore()
+    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
+    const listing = listingSnap.data() as ListingDoc | undefined
+    if (!listing || listing.sellerId === uid) return
+
+    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
+    await createNotification(listing.sellerId, {
+      type: 'listing_favorited',
+      title: '有人收藏了你的刊登',
+      body: `${vehicleName} 被加入收藏`,
+      link: `/marketplace/${listingId}`,
+    })
+  },
+)
diff --git a/functions/src/functions/notifications/on-message-created.ts b/functions/src/functions/notifications/on-message-created.ts
new file mode 100644
index 0000000..4f76473
--- /dev/null
+++ b/functions/src/functions/notifications/on-message-created.ts
@@ -0,0 +1,51 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+
+interface MessageDoc {
+  senderId: string
+  type: 'text' | 'image' | 'vehicle' | 'verification_report' | 'system'
+  text?: string
+}
+
+interface ConversationDoc {
+  memberIds: string[]
+  memberSnapshots: Record<string, { displayName: string }>
+  mutedBy?: string[]
+}
+
+const PREVIEW_BY_TYPE: Record<MessageDoc['type'], string> = {
+  text: '',
+  image: '傳送了一張照片',
+  vehicle: '分享了一台車輛',
+  verification_report: '分享了一份驗車報告',
+  system: '',
+}
+
+export const onMessageCreated = onDocumentCreated(
+  'conversations/{conversationId}/messages/{messageId}',
+  async (event) => {
+    const message = event.data?.data() as MessageDoc | undefined
+    if (!message || message.type === 'system') return
+
+    const { conversationId } = event.params
+    const db = getFirestore()
+    const convoSnap = await db.collection('conversations').doc(conversationId).get()
+    const convo = convoSnap.data() as ConversationDoc | undefined
+    if (!convo) return
+
+    const senderName = convo.memberSnapshots?.[message.senderId]?.displayName ?? '有人'
+    const preview = message.type === 'text' ? (message.text ?? '') : PREVIEW_BY_TYPE[message.type]
+    const mutedBy = convo.mutedBy ?? []
+
+    for (const uid of convo.memberIds ?? []) {
+      if (uid === message.senderId || mutedBy.includes(uid)) continue
+      await createNotification(uid, {
+        type: 'chat_message',
+        title: senderName,
+        body: preview,
+        link: `/messages/${conversationId}`,
+      })
+    }
+  },
+)
diff --git a/functions/src/functions/notifications/on-system-announcement-created.ts b/functions/src/functions/notifications/on-system-announcement-created.ts
new file mode 100644
index 0000000..f2fd314
--- /dev/null
+++ b/functions/src/functions/notifications/on-system-announcement-created.ts
@@ -0,0 +1,25 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { broadcastNotification } from '../../services/notification.service'
+
+interface SystemAnnouncementDoc {
+  title: string
+  body: string
+}
+
+/** Written only by the admin webapp's broadcast composer (see
+ *  admin-data.service.ts's sendSystemAnnouncement — firestore.rules gates
+ *  the write to isAdmin()). */
+export const onSystemAnnouncementCreated = onDocumentCreated(
+  'systemAnnouncements/{announcementId}',
+  async (event) => {
+    const announcement = event.data?.data() as SystemAnnouncementDoc | undefined
+    if (!announcement) return
+
+    await broadcastNotification({
+      type: 'system',
+      title: announcement.title,
+      body: announcement.body,
+      link: '/notifications',
+    })
+  },
+)
diff --git a/functions/src/functions/notifications/on-vehicle-news-created.ts b/functions/src/functions/notifications/on-vehicle-news-created.ts
new file mode 100644
index 0000000..865cf82
--- /dev/null
+++ b/functions/src/functions/notifications/on-vehicle-news-created.ts
@@ -0,0 +1,19 @@
+import { onDocumentCreated } from 'firebase-functions/v2/firestore'
+import { broadcastNotification } from '../../services/notification.service'
+
+interface VehicleNewsDoc {
+  title: string
+}
+
+export const onVehicleNewsCreated = onDocumentCreated('vehicleNews/{newsId}', async (event) => {
+  const news = event.data?.data() as VehicleNewsDoc | undefined
+  if (!news) return
+
+  const { newsId } = event.params
+  await broadcastNotification({
+    type: 'vehicle_news',
+    title: '車訊新知',
+    body: news.title,
+    link: `/vehicle-news/${newsId}`,
+  })
+})
diff --git a/functions/src/index.ts b/functions/src/index.ts
index e2f9437..1d77c2e 100644
--- a/functions/src/index.ts
+++ b/functions/src/index.ts
@@ -21,3 +21,18 @@ export { verifyVehicleRegistrationDocument } from './functions/analyze-vehicle-r
 // Admin 後台「AI Prompt 設定」— lets an admin view/edit the prompt text sent
 // to Gemini without a code deploy (see services/prompt-config.service.ts).
 export { getAiPromptCatalog } from './functions/get-ai-prompt-catalog'
+
+// In-app notification center — the first Firestore-triggered (as opposed to
+// callable) Functions in this codebase. Each writes into the relevant
+// user(s)' users/{uid}/notifications subcollection via
+// services/notification.service.ts; see src/views/NotificationsView.vue and
+// src/types/notification.ts on the client side.
+export { onMessageCreated } from './functions/notifications/on-message-created'
+export { onFavoriteCreated } from './functions/notifications/on-favorite-created'
+export { onAppointmentCreated } from './functions/notifications/on-appointment-created'
+export { onDiscussionCommentCreated } from './functions/notifications/on-discussion-comment-created'
+export { onDiscussionLikeCreated } from './functions/notifications/on-discussion-like-created'
+export { onDiscussionPostCreated } from './functions/notifications/on-discussion-post-created'
+export { onDiscussionPostFeatured } from './functions/notifications/on-discussion-post-featured'
+export { onVehicleNewsCreated } from './functions/notifications/on-vehicle-news-created'
+export { onSystemAnnouncementCreated } from './functions/notifications/on-system-announcement-created'
diff --git a/functions/src/services/notification.service.ts b/functions/src/services/notification.service.ts
new file mode 100644
index 0000000..a412707
--- /dev/null
+++ b/functions/src/services/notification.service.ts
@@ -0,0 +1,74 @@
+import { getFirestore, Timestamp } from 'firebase-admin/firestore'
+
+/** Mirrors src/types/notification.ts's NotificationType on the client —
+ *  keep both in sync by hand (no shared package between functions/ and the
+ *  client app in this project). */
+export type NotificationType =
+  | 'chat_message'
+  | 'listing_favorited'
+  | 'booking_request'
+  | 'system'
+  | 'vehicle_news'
+  | 'discussion_featured'
+  | 'discussion_admin_post'
+  | 'discussion_comment'
+  | 'discussion_like'
+  | 'discussion_reply'
+
+export interface NotificationInput {
+  type: NotificationType
+  title: string
+  body: string
+  link?: string
+}
+
+/** Writes one notification into a single user's feed
+ *  (users/{uid}/notifications/{id}) — the only writer of this subcollection,
+ *  per firestore.rules (client may only read its own feed / flip `read`). */
+export async function createNotification(uid: string, input: NotificationInput): Promise<void> {
+  const db = getFirestore()
+  await db
+    .collection('users')
+    .doc(uid)
+    .collection('notifications')
+    .add({
+      type: input.type,
+      title: input.title,
+      body: input.body,
+      link: input.link ?? null,
+      read: false,
+      createdAt: Timestamp.now(),
+    })
+}
+
+// Stay comfortably under Firestore's 500-write-per-batch cap.
+const BATCH_SIZE = 450
+
+/** Fans a notification out to every user in the system (system/admin/news/
+ *  featured broadcasts) — O(user count) writes, batched. Fine at this app's
+ *  current scale; a genuinely large user base would need a queue-backed
+ *  fan-out instead of one Function invocation doing it all synchronously. */
+export async function broadcastNotification(
+  input: NotificationInput,
+  excludeUid?: string,
+): Promise<void> {
+  const db = getFirestore()
+  const usersSnap = await db.collection('users').select().get()
+  const targetUids = usersSnap.docs.map((d) => d.id).filter((uid) => uid !== excludeUid)
+
+  for (let i = 0; i < targetUids.length; i += BATCH_SIZE) {
+    const batch = db.batch()
+    for (const uid of targetUids.slice(i, i + BATCH_SIZE)) {
+      const ref = db.collection('users').doc(uid).collection('notifications').doc()
+      batch.set(ref, {
+        type: input.type,
+        title: input.title,
+        body: input.body,
+        link: input.link ?? null,
+        read: false,
+        createdAt: Timestamp.now(),
+      })
+    }
+    await batch.commit()
+  }
+}
diff --git a/package-lock.json b/package-lock.json
index e0c7a0a..6522665 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -35,6 +35,7 @@
         "@vue/tsconfig": "^0.9.1",
         "eslint": "^10.9.1",
         "eslint-plugin-vue": "^10.10.0",
+        "firebase-tools": "^15.29.0",
         "globals": "^17.11.0",
         "patch-package": "^8.0.1",
         "prettier": "^3.9.6",
@@ -44,6 +45,26 @@
         "vue-tsc": "^3.3.11"
       }
     },
+    "node_modules/@apidevtools/json-schema-ref-parser": {
+      "version": "9.1.2",
+
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 6781214

---

## 2026年9月9日 週三

### 鈴鐺通知提醒、預約時間改動、報告圖視化 `92c7222`

- 使用者：li220fish
- 時間：2026-09-09 00:58
- 分類：系統
- 類型：功能

#### Prompt
push 到 firebase

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/functions/src/functions/admin-sync-conversation-names.ts b/functions/src/functions/admin-sync-conversation-names.ts
new file mode 100644
index 0000000..e8460c2
--- /dev/null
+++ b/functions/src/functions/admin-sync-conversation-names.ts
@@ -0,0 +1,74 @@
+import { onCall, HttpsError } from 'firebase-functions/v2/https'
+import { getFirestore } from 'firebase-admin/firestore'
+import { isAdminUid } from '../services/auth.service'
+
+interface ConversationDoc {
+  memberIds: string[]
+  memberSnapshots: Record<string, { displayName: string }>
+}
+
+const BATCH_SIZE = 400
+
+/**
+ * One-time (re-runnable, idempotent) maintenance tool for the 討論中心/聊天室
+ * display-name mismatch — conversations/{id}.memberSnapshots is a
+ * denormalized snapshot frozen at conversation-creation time (see
+ * conversation.service.ts's findOrCreateConversation), and had been drifting
+ * from a user's actual current users/{uid}.displayName for two reasons: (1)
+ * a rename never propagated afterward, and (2) the OTHER party's snapshot
+ * was often never accurate to begin with — copied from
+ * marketplaceListings.sellerName, itself frozen at listing-publish time, not
+ * at conversation-creation time. on-user-profile-updated.ts now keeps this
+ * in sync going forward on every rename; this callable exists purely to
+ * correct whatever's already wrong in Firestore as of today. Admin-only,
+ * safe to run more than once — it only writes a conversation whose stored
+ * name actually differs from the member's current one.
+ */
+export const adminSyncConversationMemberNames = onCall({}, async (request) => {
+  if (!isAdminUid(request.auth?.uid)) {
+    throw new HttpsError('permission-denied', 'Admin only.')
+  }
+
+  const db = getFirestore()
+  const [usersSnap, conversationsSnap] = await Promise.all([
+    db.collection('users').get(),
+    db.collection('conversations').get(),
+  ])
+
+  const currentNameByUid = new Map<string, string>()
+  for (const docSnap of usersSnap.docs) {
+    const displayName = docSnap.data().displayName as string | null | undefined
+    if (displayName) currentNameByUid.set(docSnap.id, displayName)
+  }
+
+  let batch = db.batch()
+  let opsInBatch = 0
+  const pending: Promise<unknown>[] = []
+  let conversationsUpdated = 0
+
+  for (const docSnap of conversationsSnap.docs) {
+    const data = docSnap.data() as ConversationDoc
+    const updates: Record<string, string> = {}
+    for (const memberId of data.memberIds ?? []) {
+      const currentName = currentNameByUid.get(memberId)
+      const storedName = data.memberSnapshots?.[memberId]?.displayName
+      if (currentName && currentName !== storedName) {
+        updates[`memberSnapshots.${memberId}.displayName`] = currentName
+      }
+    }
+    if (Object.keys(updates).length === 0) continue
+
+    batch.update(docSnap.ref, updates)
+    opsInBatch++
+    conversationsUpdated++
+    if (opsInBatch === BATCH_SIZE) {
+      pending.push(batch.commit())
+      batch = db.batch()
+      opsInBatch = 0
+    }
+  }
+  if (opsInBatch > 0) pending.push(batch.commit())
+  await Promise.all(pending)
+
+  return { conversationsScanned: conversationsSnap.size, conversationsUpdated }
+})
diff --git a/functions/src/functions/notifications/on-appointment-created.ts b/functions/src/functions/notifications/on-appointment-created.ts
index ca8541f..4699560 100644
--- a/functions/src/functions/notifications/on-appointment-created.ts
+++ b/functions/src/functions/notifications/on-appointment-created.ts
@@ -1,6 +1,7 @@
 import { onDocumentCreated } from 'firebase-functions/v2/firestore'
 import { getFirestore } from 'firebase-admin/firestore'
 import { createNotification } from '../../services/notification.service'
+import { findConversationId } from '../../services/conversation-lookup.service'
 
 interface ListingDoc {
   sellerId: string
@@ -25,11 +26,17 @@ export const onAppointmentCreated = onDocumentCreated(
     if (!listing || listing.sellerId === appointment.buyerId) return
 
     const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
+    const conversationId = await findConversationId(
+      db,
+      listing.sellerId,
+      appointment.buyerId,
+      listingId,
+    )
     await createNotification(listing.sellerId, {
       type: 'booking_request',
       title: '新的看車預約',
       body: `${appointment.buyerName} 預約看 ${vehicleName}`,
-      link: `/marketplace/${listingId}`,
+      link: conversationId ? `/messages/${conversationId}` : `/marketplace/${listingId}`,
     })
   },
 )
diff --git a/functions/src/functions/notifications/on-appointment-status-updated.ts b/functions/src/functions/notifications/on-appointment-status-updated.ts
new file mode 100644
index 0000000..d9978a4
--- /dev/null
+++ b/functions/src/functions/notifications/on-appointment-status-updated.ts
@@ -0,0 +1,64 @@
+import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
+import { getFirestore, Timestamp } from 'firebase-admin/firestore'
+import { createNotification } from '../../services/notification.service'
+import { findConversationId } from '../../services/conversation-lookup.service'
+
+interface ListingDoc {
+  sellerId: string
+  vehicleSnapshot: { brand: string; model: string }
+}
+
+interface AppointmentDoc {
+  buyerId: string
+  scheduledAt: Timestamp
+  status?: 'pending' | 'approved' | 'declined' | 'cancelled'
+}
+
+function formatDateTime(ms: number): string {
+  return new Date(ms).toLocaleString('zh-TW', {
+    month: 'numeric',
+    day: 'numeric',
+    hour: '2-digit',
+    minute: '2-digit',
+  })
+}
+
+/**
+ * The seller approving/declining a booking used to only ever reach the
+ * buyer as a live in-chat toast (ChatRoomView.vue's appointmentToast) —
+ * invisible unless the buyer happened to already be sitting in that exact
+ * chat room the moment it happened. This writes a persistent notification
+ * into the buyer's /notifications feed instead (same pattern as
+ * on-appointment-created.ts, just for the seller's decision rather than the
+ * buyer's original request), so it's there whenever they next check.
+ */
+export const onAppointmentStatusUpdated = onDocumentUpdated(
+  'marketplaceListings/{listingId}/appointments/{appointmentId}',
+  async (event) => {
+    const before = event.data?.before.data() as AppointmentDoc | undefined
+    const after = event.data?.after.data() as AppointmentDoc | undefined
+    if (!before || !after) return
+    if (before.status !== 'pending') return
+    if (after.status !== 'approved' && after.status !== 'declined') return
+
+    const { listingId } = event.params
+    const db = getFirestore()
+    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
+    const listing = listingSnap.data() as ListingDoc | undefined
+    if (!listing) return
+
+    const scheduledAt = after.scheduledAt?.toMillis?.() ?? Date.now()
+    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
+    const conversationId = await findConversationId(db, listing.sellerId, after.buyerId, listingId)
+    const approved = after.status === 'approved'
+
+    await createNotification(after.buyerId, {
+      type: approved ? 'booking_approved' : 'booking_declined',
+      title: approved ? '預約已同意' : '預約已婉拒',
+      body: approved
+        ? `賣家同意了您 ${formatDateTime(scheduledAt)} 賞車 ${vehicleName} 的預約`
+        : `賣家婉拒了您 ${formatDateTime(scheduledAt)} 賞車 ${vehicleName} 的預約`,
+      link: conversationId ? `/messages/${conversationId}` : `/marketplace/${listingId}`,
+    })
+  },
+)
diff --git a/functions/src/functions/on-user-profile-updated.ts b/functions/src/functions/on-user-profile-updated.ts
new file mode 100644
index 0000000..395fbc9
--- /dev/null
+++ b/functions/src/functions/on-user-profile-updated.ts
@@ -0,0 +1,56 @@
+import { onDocumentWritten } from 'firebase-functions/v2/firestore'
+import { getFirestore } from 'firebase-admin/firestore'
+
+const BATCH_SIZE = 400
+
+interface UserProfileDoc {
+  displayName?: string | null
+}
+
+/**
+ * Keeps conversations/{id}.memberSnapshots.{uid}.displayName in sync with a
+ * user's actual current name whenever they rename (AccountView.vue ->
+ * authStore.updateDisplayName -> userProfileService.touchUserProfile writes
+ * users/{uid}) — without this, every existing chat conversation would keep
+ * showing whatever name was frozen in at conversation-creation time forever,
+ * while 討論中心 always shows a fresh authorSnapshot for every new post/
+ * comment (see conversation.service.ts's findOrCreateConversation — this app
+ * intentionally freezes display identity at write time everywhere; this
+ * trigger just re-freezes chat's copy whenever the source actually changes).
+ * adminSyncConversationMemberNames (admin-sync-conversation-names.ts) is the
+ * one-time counterpart that corrects whatever was already wrong before this
+ * trigger existed.
+ *
+ * touchUserProfile writes users/{uid} on every auth-state resolution (every
+ * login), not just on a real rename — comparing before/after displayName
+ * (not just reacting to any write) keeps this a no-op on those routine
+ * touches instead of re-scanning every member's conversations each time.
+ */
+export const onUserProfileUpdated = onDocumentWritten('users/{uid}', async (event) => {
+  const before = event.data?.before.data() as UserProfileDoc | undefined
+  const after = event.data?.after.data() as UserProfileDoc | undefined
+  if (!after?.displayName || before?.displayName === after.displayName) return
+
+  const { uid } = event.params
+  const db = getFirestore()
+  const snapshot = await db
+    .collection('conversations')
+    .where('memberIds', 'array-contains', uid)
+    .get()
+  if (snapshot.empty) return
+
+  let batch = db.batch()
+  let opsInBatch = 0
+  const pending: Promise<unknown>[] = []
+  for (const docSnap of snapshot.docs) {
+    batch.update(docSnap.ref, { [`memberSnapshots.${uid}.displayName`]: after.displayName })
+    opsInBatch++
+    if (opsInBatch === BATCH_SIZE) {
+      pending.push(batch.commit())
+      batch = db.batch()
+      opsInBatch = 0
+    }
+  }
+  if (opsInBatch > 0) pending.push(batch.commit())
+  await Promise.all(pending)
+})
diff --git a/functions/src/index.ts b/functions/src/index.ts
index 1d77c2e..be631d4 100644
--- a/functions/src/index.ts
+++ b/functions/src/index.ts
@@ -30,9 +30,18 @@ export { getAiPromptCatalog } from './functions/get-ai-prompt-catalog'
 export { onMessageCreated } from './functions/notifications/on-message-created'
 export { onFavoriteCreated } from './functions/notifications/on-favorite-created'
 export { onAppointmentCreated } from './functions/notifications/on-appointment-created'
+export { onAppointmentStatusUpdated } from './functions/notifications/on-appointment-status-updated'
 export { onDiscussionCommentCreated } from './functions/notifications/on-discussion-comment-created'
 export { onDiscussionLikeCreated } from './functions/notifications/on-discussion-like-created'
 export { onDiscussionPostCreated } from './functions/notifications/on-discussion-post-created'
 export { onDiscussionPostFeatured } from './functions/notifications/on-discussion-post-featured'
 export { onVehicleNewsCreated } from './functions/notifications/on-vehicle-news-created'
 export { onSystemAnnouncementCreated } from './functions/notifications/on-system-announcement-created'
+
+// Keeps conversations/{id}.memberSnapshots' displayName in sync with each
+// member's actual current users/{uid}.displayName, so 聊天室 stops showing a
+// stale/mismatched name relative to 討論中心 — see on-user-profile-updated.ts
+// (ongoing, fires on rename) and admin-sync-conversation-names.ts (one-time
+// backfill for conversations that were already wrong before this existed).
+export { onUserProfileUpdated } from './functions/on-user-profile-updated'
+export { adminSyncConversationMemberNames } from './functions/admin-sync-conversation-names'
diff --git a/functions/src/services/cold-touch.service.ts b/functions/src/services/cold-touch.service.ts
index 9f78a7c..88a64f0 100644
--- a/functions/src/services/cold-touch.service.ts
+++ b/functions/src/services/cold-touch.service.ts
@@ -33,13 +33,74 @@ interface ColdTouchMetadata {
  *  edit-lock for ANY item today, so the Trusted Backend re-checking this
  *  itself, rather than trusting client navigation state, is what actually
  *  holds here). */
-async function assertStartupNotYetBegun(verificationId: string): Promise<void> {
+async function coldCheckWindowStillOpen(verificationId: string): Promise<boolean> {
   const existing = await getAnswer(verificationId, STARTUP_ITEM_ID)
-  if (existing) {
-    throw new Error(
-      'Startup has already begun for this verification — Step 39 cold-state check can no longer be performed or redone.',
-    )
+  return !existing
+}
+
+/**
+ * Once the window above has closed there is nothing left to verify — this is
+ * NOT a failure, so it must resolve normally, not throw (an onCall `Error`
+ * here previously surfaced to the client as an opaque 500 "INTERNAL" with no
+ * explanation, and worse, permanently marked 'coldCheck' 'failed' —
+ * Verification.canComplete became permanently unsatisfiable for this
+ * verification, since every 重試 tap hits this exact same guard forever with
+ * no way out. Reproduced live 2026-09-08).
+ *
+ * ColdTouchCapture.vue already wrote a manual placeholder Answer
+ * (`saveAnswer('ENG-02', 'normal')`) the instant the video was recorded —
+ * this keeps that `result` untouched (never silently flips 正常→須注意 or vice
+ * versa) but, unlike the original fix, actually writes an honest `aiResult`
+ * explaining WHY no real Gemini review happened, using the same
+ * backend-decided-with-zero-Gemini-cost shape as writeSystemNotApplicable —
+ * `model: 'motoverify-backend-rules'`, never claiming to be a real model
+ * response. Without this, the report's "AI 判定說明" line stayed completely
+ * blank and a viewer had no way to tell "actually reviewed, genuinely fine"
+ * apart from "never reviewed at all, timing just didn't allow it" — the two
+ * look identical without an explicit note.
+ */
+async function acceptExistingManualAnswer(verificationId: string): Promise<GeminiItemResult> {
+  const existing = await getAnswer(verificationId, ENG_02)
+  const result = existing?.result ?? 'normal'
+  const coldStateValid = result === 'normal'
+  const note =
+    '引擎已啟動，冷車觸感無法再進行 AI 覆核，維持錄影當下車主自行確認的結果，未經 AI 檢視。'
+  const item: GeminiItemResult = {
+    itemId: ENG_02,
+    result,
+    confidence: null,
+    label: 'cold_state_window_closed',
+    note,
+    evidenceIds: [],
+    problematicEvidenceIds: [],
+    retakeInstruction: null,
+    details: { semanticItemId: COLD_ENGINE_TOUCH_ITEM_ID, coldStateValid },
   }
+  await writeAiAnswer({
+    verificationId,
+    item,
+    modelId: 'motoverify-backend-rules',
+    modelVersion: 'cold-check-window-closed-v1',
+    analysisType: 'vision',
+    promptVersion: { global: 'n/a', group: 'n/a', retry: null },
+    attempt: 1,
+    existing,
+  })
+  await getFirestore()
+    .collection('verifications')
+    .doc(verificationId)
+    .set(
+      {
+        coldStateContext: {
+          coldEngineTouchCheck: result,
+          coldStateValid,
+          performedBeforeStartup: false,
+          analysisVersion: 'manual-fallback-window-closed',
+        },
+      },
+      { merge: true },
+    )
+  return item
 }
 
 function contactWindowFrameTimestamps(metadata: ColdTouchMetadata, durationMs: number): number[] {
@@ -159,7 +220,9 @@ export async function analyzeColdEngineTouch(params: {
   apiKey: string
 }): Promise<GeminiItemResult> {
   return withAnalysisStatus(params.verificationId, 'coldCheck', async () => {
-    await assertStartupNotYetBegun(params.verificationId)
+    if (!(await coldCheckWindowStillOpen(params.verificationId))) {
+      return acceptExistingManualAnswer(params.verificationId)
+    }
 
     const video = await resolveVideoEvidence(params.verificationId, ENG_02)
     const metadata = video.metadata as ColdTouchMetadata
@@ -212,7 +275,9 @@ export async function retryColdEngineTouch(params: {
   apiKey: string
   newEvidenceId: string
 }): Promise<GeminiItemResult> {
-  await assertStartupNotYetBegun(params.verificationId)
+  if (!(await coldCheckWindowStillOpen(params.verificationId))) {
+    return acceptExistingManualAnswer(params.verificationId)
+  }
 
   const existing = await getAnswer(params.verificationId, ENG_02)
   assertRetryEligible(existing)
diff --git a/functions/src/services/conversation-lookup.service.ts b/functions/src/services/conversation-lookup.service.ts
new file mode 100644
index 0000000..82cb92a
--- /dev/null
+++ b/functions/src/services/conversation-lookup.service.ts
@@ -0,0 +1,39 @@
+import type { Firestore } from 'firebase-admin/firestore'
+
+interface ConversationDoc {
+  memberIds: string[]
+  context?: { listingId?: string }
+}
+
+/**
+ * Finds the 1:1 seller+buyer conversation for a given listing — the buyer
+ * already creates (or reuses) this conversation client-side BEFORE writing
+ * an appointment doc (see MarketplaceListingView.vue's handleBookingSubmit)
+ * specifically so it's guaranteed to exist by the time any
+ * appointment-related trigger runs. Same array-contains + client-side-filter
+ * shape as conversation.service.ts's findOrCreateConversation, just queried
+ * by the seller's membership from the admin SDK instead of the buyer's.
+ * Shared by every appointment notification trigger (created/approved/
+ * declined) so each notification's `link` can point straight at the chat
+ * instead of the listing page.
+ */
+export async function findConversationId(
+  db: Firestore,
+  sellerId: string,
+  buyerId: string,
+  listingId: string,
+): Promise<string | null> {
+  const snapshot = await db
+    .collection('conversations')
+    .where('memberIds', 'array-contains', sellerId)
+    .get()
+  const match = snapshot.docs.find((docSnapshot) => {
+    const data = docSnapshot.data() as ConversationDoc
+    return (
+      data.memberIds.length === 2 &&
+      data.memberIds.includes(buyerId) &&
+      data.context?.listingId === listingId
+    )
+  })
+  return match?.id ?? null
+}
diff --git a/functions/src/services/notification.service.ts b/functions/src/services/notification.service.ts
index a412707..4a233e6 100644
--- a/functions/src/services/notification.service.ts
+++ b/functions/src/services/notification.service.ts
@@ -7,6 +7,8 @@ export type NotificationType =
   | 'chat_message'
   | 'listing_favorited'
   | 'booking_request'
+  | 'booking_approved'
+  | 'booking_declined'
   | 'system'
   | 'vehicle_news'
   | 'discussion_featured'
diff --git a/functions/tsconfig.tsbuildinfo b/functions/tsconfig.tsbuildinfo
new file mode 100644
index 0000000..bca9479
--- /dev/null
+++ b/functions/tsconfig.tsbuildinfo
@@ -0,0 +1 @@
+{"root":["./src/config.ts","./src/index.ts","./src/ai/validator.ts","./src/ai/gemini/cache.ts","./src/ai/gemini/client.ts","./src/ai/prompts/cold-engine-touch-v2.ts","./src/ai/prompts/cold-engine-touch-v3.ts","./src/ai/prompts/core-vision-v2.ts","./src/ai/prompts/dashboard-ocr-v2.ts","./src/ai/prompts/global-inspection-v1.ts","./src/ai/prompts/global-inspection-v2.ts","./src/ai/prompts/registration-ocr-v1.ts","./src/ai/prompts/registry.ts","./src/ai/prompts/retry-base-v1.ts","./src/ai/prompts/audio/engine-audio-v2.ts","./src/ai/prompts/retry/core-vision-v2-retry.ts","./src/ai/providers/audio-inspection-provider.ts","./src/ai/providers/vision-inspection-provider.ts","./src/ai/schemas/common.ts","./src/ai/schemas/schema-builder.ts","./src/functions/admin-sync-conversation-names.ts","./src/functions/analyze-cold-engine-touch.ts","./src/functions/analyze-core-vision-v2.ts","./src/functions/analyze-document-maintenance.ts","./src/functions/analyze-engine-sensor-session.ts","./src/functions/analyze-ocr.ts","./src/functions/analyze-vehicle-registration.ts","./src/functions/get-ai-prompt-catalog.ts"
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 92c7222

#### 時數
2.5

---

### APP v0.5 優化討論

- 使用者：Archi
- 時間：2026-09-09
- 分類：系統
- 類型：討論

#### 摘要
bug 與使用體驗討論

#### 結果
驗證完成，功能確定上線（結案：2026-09-09）

#### 時數
12

---

### 車輛型號選單改為廠牌/車系/排氣量/名稱四層篩選，並匯入台灣機車型號 CSV `681b2b2`

- 使用者：Archi
- 時間：2026-09-09 15:50
- 分類：系統
- 類型：功能

#### Prompt
這是清單表，把他放進「我的車輛」、「選單選則」內，原本的項目有廠牌、車型，現在改為「廠牌」、「車系」、「排氣量」、「名稱」，其中「排氣量」的選單內容有：50cc以下、51~125、126~250、251~549、549~1000、1000以上，csv中有「鏈條」的選項，如果鏈條的值是true, 應該要在基礎13項檢測中多增加一項：鏈條

#### 摘要
排氣量以固定級距分桶（50cc以下～1000以上），型號資料含鏈條傳動欄位；
基礎13項健檢在車輛標記有鏈條傳動時，動態多顯示「鏈條」一項。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/package.json b/package.json
index 27b603d..355a84b 100644
--- a/package.json
+++ b/package.json
@@ -14,6 +14,7 @@
     "seed:demo-data": "node scripts/seed-demo-data.mjs",
     "seed:mock-vehicles": "node scripts/seed-mock-vehicles.mjs",
     "seed:marketplace-mock": "node scripts/seed-marketplace-mock.mjs",
+    "import:vehicle-models": "node scripts/import-vehicle-models-csv.mjs",
     "cleanup:database": "node scripts/cleanup-database.mjs",
     "cap:sync": "npm run build && npx cap sync",
     "cap:android": "npx cap open android",
diff --git a/scripts/import-vehicle-models-csv.mjs b/scripts/import-vehicle-models-csv.mjs
new file mode 100644
index 0000000..3cd3603
--- /dev/null
+++ b/scripts/import-vehicle-models-csv.mjs
@@ -0,0 +1,229 @@
+/**
+ * One-time (re-runnable) import of a curated 台灣機車重機型號表 CSV into the
+ * `vehicleModels` reference collection — backs VehicleModelSelect.vue's
+ * 廠牌/車系/排氣量/名稱 cascading picker and BasicHealthCheck13.vue's
+ * conditional 鏈條 item (see Vehicle.hasChain in src/types/vehicle.ts).
+ *
+ * CSV columns (UTF-8, no quoted fields): 廠牌,車系,名稱,排氣量,油耗,馬力,
+ * 形式,鏈條傳動,圖片路徑,同義詞 — mapped to brand/series/trimName/
+ * displacementCc/-/-/bodyType/hasChain/-/-. 油耗、馬力、圖片路徑、同義詞 are
+ * intentionally NOT imported: fuel/power are rough estimates not worth
+ * treating as spec data, and cover images are a separate in-progress effort
+ * (scripts/fetch-model-image-candidates.mjs / apply-model-image.mjs).
+ *
+ * 排氣量 sometimes lists more than one CC value for one row (e.g.
+ * "124.5/155.8 CC" for a model sold in two displacements) — each distinct
+ * value becomes its own vehicleModels doc sharing the same brand/series/
+ * trimName/bodyType/hasChain, so 排氣量 bucketing in the picker works
+ * correctly for each variant.
+ *
+ * Idempotent: every doc this script writes is tagged importSource=
+ * CSV_IMPORT_SOURCE; on each run, existing docs with that same tag are
+ * deleted before re-inserting, so re-running replaces this script's own
+ * output in place instead of accumulating duplicates. Docs from any other
+ * source (admin-added via ModelsSection.vue, or another import) are
+ * untouched since they won't carry this tag.
+ *
+ * Usage:
+ *   ALLOW_TEST_SEED=true node scripts/import-vehicle-models-csv.mjs [csvPath]
+ * Defaults to ~/Downloads/台灣機車重機型號表_1990至今.csv if no path given.
+ */
+import { readFileSync, existsSync } from 'node:fs'
+import { fileURLToPath } from 'node:url'
+import os from 'node:os'
+import path from 'node:path'
+
+import { initializeApp } from 'firebase/app'
+import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
+import {
+  addDoc,
+  collection,
+  deleteDoc,
+  getDocs,
+  getFirestore,
+  query,
+  serverTimestamp,
+  where,
+} from 'firebase/firestore'
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url))
+const rootDir = path.resolve(__dirname, '..')
+
+const CSV_IMPORT_SOURCE = 'csv-1990-present'
+const DEFAULT_CSV_PATH = path.join(os.homedir(), 'Downloads', '台灣機車重機型號表_1990至今.csv')
+
+const EMPTY_SPECS = {
+  engine: {
+    coolingType: null,
+    cylinderCount: null,
+    valveTrain: null,
+    valvesPerCylinder: null,
+    compressionRatio: null,
+    maxPowerHp: null,
+    maxPowerRpm: null,
+    maxTorqueKgm: null,
+    maxTorqueRpm: null,
+    fuelSystem: null,
+    startSystem: null,
+    fuelTankCapacityL: null,
+  },
+  electric: { motorPowerW: null, motorPowerRpm: null, batteryCount: null },
+  dimensions: {
+    lengthMm: null,
+    widthMm: null,
+    heightMm: null,
+    seatHeightMm: null,
+    wheelbaseMm: null,
+    weightKg: null,
+  },
+  safety: { abs: false, tcs: false, cbs: false },
+  efficiency: { officialAverageKmPerL: null, fuelType: null, emissionStandard: null },
+}
+
+const EMPTY_FEATURES = {
+  convenience: { keyless: false, usbCharging: false, idleStop: false, reverseAssist: false },
+  display: { displayType: null, smartphoneConnect: false, navigationSupport: false },
+  lighting: {
+    ledHeadlight: false,
+    ledTaillight: false,
+    ledTurnSignals: false,
+    hazardLights: false,
+  },
+  storage: { underSeatStorageL: null, frontStorage: false },
+  security: { immobilizer: false, antiTheftAlarm: false },
+}
+
+function loadEnvFile(filePath) {
+  if (!existsSync(filePath)) return {}
+  const result = {}
+  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
+    const trimmed = line.trim()
+    if (!trimmed || trimmed.startsWith('#')) continue
+    const eq = trimmed.indexOf('=')
+    if (eq === -1) continue
+    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
+  }
+  return result
+}
+
+function guardEnvironment() {
+  if (process.env.NODE_ENV === 'production') {
+    console.error('[import-vehicle-models-csv] Refusing to run: NODE_ENV=production.')
+    process.exit(1)
+  }
+  if (process.env.ALLOW_TEST_SEED !== 'true') {
+    console.error(
+      '[import-vehicle-models-csv] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
+    )
+    process.exit(1)
+  }
+}
+
+/** "124.5/155.8 CC" -> [124.5, 155.8]; "97 CC" -> [97]. */
+function parseDisplacements(raw) {
+  return raw
+    .replace(/CC/i, '')
+    .split('/')
+    .map((part) => Number.parseFloat(part.trim()))
+    .filter((value) => Number.isFinite(value))
+}
+
+function parseCsv(text) {
+  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
+  const [, ...rows] = lines // drop header row — column order is documented above, not re-derived
+  return rows.map((line) => {
+    const [brand, series, trimName, displacement, , , bodyType, hasChainRaw] = line.split(',')
+    return {
+      brand: brand?.trim() ?? '',
+      series: series?.trim() ?? '',
+      trimName: trimName?.trim() ?? '',
+      displacements: parseDisplacements(displacement ?? ''),
+      bodyType: bodyType?.trim() || null,
+      hasChain: hasChainRaw?.trim().toLowerCase() === 'true',
+    }
+  })
+}
+
+async function main() {
+  guardEnvironment()
+
+  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH
+  if (!existsSync(csvPath)) {
+    console.error(`[import-vehicle-models-csv] CSV not found: ${csvPath}`)
+    process.exit(1)
+  }
+
+  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
+  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
+  const env = { ...envDefault, ...envLocal, ...process.env }
+  const firebaseConfig = {
+    apiKey: env.VITE_FIREBASE_API_KEY,
+    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
+    projectId: env.VITE_FIREBASE_PROJECT_ID,
+    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
+    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
+    appId: env.VITE_FIREBASE_APP_ID,
+  }
+  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
+    console.error('[import-vehicle-models-csv] Missing Firebase config — check .env / .env.local.')
+    process.exit(1)
+  }
+
+  const app = initializeApp(firebaseConfig)
+  const auth = getAuth(app)
+  const db = getFirestore(app)
+  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')
+
+  console.log(`[import-vehicle-models-csv] Project: ${firebaseConfig.projectId}`)
+  console.log(`[import-vehicle-models-csv] CSV: ${csvPath}`)
+
+  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))
+  console.log(`[import-vehicle-models-csv] Parsed ${rows.length} CSV rows.`)
+
+  const modelsCollection = collection(db, 'vehicleModels')
+
+  const staleSnapshot = await getDocs(
+    query(modelsCollection, where('importSource', '==', CSV_IMPORT_SOURCE)),
+  )
+  if (staleSnapshot.size > 0) {
+    console.log(`[import-vehicle-models-csv] Removing ${staleSnapshot.size} docs from a prior run...`)
+    await Promise.all(staleSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)))
+  }
+
+  let written = 0
+  for (const row of rows) {
+    if (!row.brand || !row.trimName) continue
+    const displacements = row.displacements.length > 0 ? row.displacements : [null]
+    for (const displacementCc of displacements) {
+      await addDoc(modelsCollection, {
+        brand: row.brand,
+        series: row.series,
+        modelYear: null,
+        trimName: row.trimName,
+        bodyType: row.bodyType,
+        powerType: 'gasoline',
+        displacementCc,
+        transmission: null,
+        hasChain: row.hasChain,
+        coverImageUrl: null,
+        photos: [],
+        specs: EMPTY_SPECS,
+        features: EMPTY_FEATURES,
+        realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
+        reviewStats: { averageRating: null, reviewCount: 0 },
+        importSource: CSV_IMPORT_SOURCE,
+        createdAt: serverTimestamp(),
+      })
+      written += 1
+    }
+  }
+
+  console.log(`[import-vehicle-models-csv] Wrote ${written} vehicleModels docs.`)
+}
+
+main()
+  .then(() => process.exit(0))
+  .catch((error) => {
+    console.error('[import-vehicle-models-csv] Failed:', error)
+    process.exit(1)
+  })
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index 489c7d5..dc3480e 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -22,6 +22,7 @@ const draft = reactive({
   powerType: 'gasoline' as 'gasoline' | 'electric',
   displacementCc: '',
   transmission: '',
+  hasChain: false,
   maxPowerHp: '',
   maxTorqueKgm: '',
   fuelTankCapacityL: '',
@@ -43,6 +44,7 @@ function resetDraft(): void {
   draft.powerType = 'gasoline'
   draft.displacementCc = ''
   draft.transmission = ''
+  draft.hasChain = false
   draft.maxPowerHp = ''
   draft.maxTorqueKgm = ''
   draft.fuelTankCapacityL = ''
@@ -76,6 +78,7 @@ async function handleCreate(): Promise<void> {
       powerType: draft.powerType,
       displacementCc: numberOrNull(draft.displacementCc),
       transmission: draft.transmission.trim() || null,
+      hasChain: draft.hasChain,
       specs: {
         maxPowerHp: numberOrNull(draft.maxPowerHp),
         maxTorqueKgm: numberOrNull(draft.maxTorqueKgm),
@@ -171,6 +174,9 @@ onMounted(async () => {
             ><input v-model="draft.transmission" type="text" placeholder="CVT 無段變速"
           /></label>
         </div>
+        <div class="admin-form-row" style="margin-top: 10px">
+          <label class="admin-check"><input v-model="draft.hasChain" type="checkbox" /> 鏈條傳動</label>
+        </div>
 
         <p class="admin-form-subhead">規格（選填）</p>
         <div class="admin-form-row">
diff --git a/src/admin/services/admin-data.service.ts b/src/admin/services/admin-data.service.ts
index 75c40c1..337f2eb 100644
--- a/src/admin/services/admin-data.service.ts
+++ b/src/admin/services/admin-data.service.ts
@@ -389,6 +389,10 @@ export interface AdminVehicleModel {
   powerType: VehiclePowerType
   displacementCc: number | null
   transmission: string | null
+  /** 鏈條傳動 — feeds Vehicle.hasChain (see types/vehicle.ts) when a user
+   * picks this model, which in turn drives whether BasicHealthCheck13.vue's
+   * checklist includes the 鏈條 item. */
+  hasChain: boolean
   coverImageUrl: string | null
   photos: string[]
   specs: VehicleModelSpecs
@@ -467,6 +471,7 @@ export async function listVehicleModels(): Promise<AdminVehicleModel[]> {
       powerType: data.powerType ?? 'gasoline',
       displacementCc: data.displacementCc ?? null,
       transmission: data.transmission ?? null,
+      hasChain: data.hasChain ?? false,
       coverImageUrl: data.coverImageUrl ?? null,
       photos: data.photos ?? [],
       specs: { ...EMPTY_SPECS, ...data.specs },
@@ -487,6 +492,7 @@ export interface CreateVehicleModelInput {
   powerType: VehiclePowerType
   displacementCc: number | null
   transmission: string | null
+  hasChain: boolean
   specs: {
     maxPowerHp: number | null
     maxTorqueKgm: number | null
@@ -531,6 +537,7 @@ export async function createVehicleModel(input: CreateVehicleModelInput): Promis
     powerType: input.powerType,
     displacementCc: input.displacementCc,
     transmission: input.transmission,
+    hasChain: input.hasChain,
     coverImageUrl: null,
     photos: [],
     specs,
diff --git a/src/components/common/VehicleModelSelect.vue b/src/components/common/VehicleModelSelect.vue
index 687581a..505fd1f 100644
--- a/src/components/common/VehicleModelSelect.vue
+++ b/src/components/common/VehicleModelSelect.vue
@@ -1,5 +1,5 @@
 <script setup lang="ts">
-import { computed, onMounted, ref } from 'vue'
+import { computed, onMounted, ref, watch } from 'vue'
 
 import {
   vehicleModelService,
@@ -7,19 +7,46 @@ import {
 } from '@/services/firebase/vehicle-model.service'
 
 /**
- * 廠牌/車型 Search Select backed by the `vehicleModels` reference collection
- * (Task B4) — falls back to plain text input when the user's vehicle isn't
- * in the catalog yet (or the catalog has nothing loaded), so an incomplete
- * admin-curated dataset never blocks creating a vehicle/listing.
+ * 廠牌/車系/排氣量/名稱 cascading Search Select backed by the `vehicleModels`
+ * reference collection — falls back to plain text input for 廠牌/名稱 when
+ * the user's vehicle isn't in the catalog yet (or the catalog has nothing
+ * loaded), so an incomplete admin-curated dataset never blocks creating a
+ * vehicle/listing. 車系 and 排氣量 are narrowing steps only (no v-model of
+ * their own) — they exist to help pick the right 名稱 among catalog entries
+ * that share a 車系, not to be persisted separately (Vehicle has no 車系
+ * field of its own).
  */
 const brand = defineModel<string>('brand', { required: true })
 const model = defineModel<string>('model', { required: true })
 
 const emit = defineEmits<{ modelPicked: [VehicleModelOption | null] }>()
 
+interface DisplacementBucket {
+  key: string
+  label: string
+  min: number
+  max: number
+}
+
+const BUCKETS: DisplacementBucket[] = [
+  { key: '50-', label: '50cc以下', min: 0, max: 50 },
+  { key: '51-125', label: '51~125', min: 51, max: 125 },
+  { key: '126-250', label: '126~250', min: 126, max: 250 },
+  { key: '251-549', label: '251~549', min: 251, max: 549 },
+  { key: '550-1000', label: '549~1000', min: 550, max: 1000 },
+  { key: '1000+', label: '1000以上', min: 1001, max: Infinity },
+]
+
+function bucketFor(cc: number | null): DisplacementBucket | null {
+  if (cc == null) return null
+  return BUCKETS.find((bucket) => cc >= bucket.min && cc <= bucket.max) ?? null
+}
+
 const options = ref<VehicleModelOption[]>([])
 const manualBrand = ref(false)
 const manualModel = ref(false)
+const series = ref('')
+const bucketKey = ref('')
 
 onMounted(async () => {
   try {
@@ -36,9 +63,28 @@ onMounted(async () => {
 const brands = computed(() =>
   [...new Set(options.value.map((option) => option.brand))].filter(Boolean).sort(),
 )
-const modelsForBrand = computed(() =>
-  options.value.filter((option) => option.brand === brand.value),
+const optionsForBrand = computed(() => options.value.filter((option) => option.brand === brand.value))
+const seriesForBrand = computed(() =>
+  [...new Set(optionsForBrand.value.map((option) => option.series))].filter(Boolean).sort(),
 )
+const optionsForSeries = computed(() =>
+  optionsForBrand.value.filter((option) => option.series === series.value),
+)
+const bucketsForSeries = computed(() => {
+  const present = new Set(
+    optionsForSeries.value.map((option) => bucketFor(option.displacementCc)?.key).filter(Boolean),
+  )
+  return BUCKETS.filter((bucket) => present.has(bucket.key))
+})
+const optionsForBucket = computed(() =>
+  optionsForSeries.value.filter((option) => bucketFor(option.displacementCc)?.key === bucketKey.value),
+)
+
+// A series with only one displacement bucket doesn't need the extra tap —
+// auto-select it so 名稱 becomes pickable right after 車系.
+watch(bucketsForSeries, (buckets) => {
+  bucketKey.value = buckets.length === 1 ? buckets[0].key : ''
+})
 
 function selectBrand(value: string): void {
   if (value === '__manual__') {
@@ -50,11 +96,26 @@ function selectBrand(value: string): void {
     return
   }
   brand.value = value
+  series.value = ''
+  bucketKey.value = ''
   model.value = ''
   manualModel.value = false
   emit('modelPicked', null)
 }
 
+function selectSeries(value: string): void {
+  series.value = value
+  bucketKey.value = ''
+  model.value = ''
+  emit('modelPicked', null)
+}
+
+function selectBucket(value: string): void {
+  bucketKey.value = value
+  model.value = ''
+  emit('modelPicked', null)
+}
+
 function selectModel(value: string): void {
   if (value === '__manual__') {
     manualModel.value = true
@@ -63,7 +124,7 @@ function selectModel(value: string): void {
     return
   }
   model.value = value
-  emit('modelPicked', modelsForBrand.value.find((option) => option.model === value) ?? null)
+  emit('modelPicked', optionsForBucket.value.find((option) => option.name === value) ?? null)
 }
 
 function resetToSelect(): void {
@@ -71,6 +132,8 @@ function resetToSelect(): void {
   manualModel.value = false
   brand.value = ''
   model.value = ''
+  series.value = ''
+  bucketKey.value = ''
   emit('modelPicked', null)
 }
 </script>
@@ -92,22 +155,52 @@ function resetToSelect(): void {
       <input v-else v-model="brand" type="text" placeholder="廠牌，例如 YAMAHA" required />
     </label>
 
+    <template v-if="!manualModel">
+      <label class="field">
+        <span>車系</span>
+        <select
+          :value="series"
+          required
+          :disabled="!brand"
+          @change="selectSeries(($event.target as HTMLSelectElement).value)"
+        >
+          <option value="" disabled>請選擇車系</option>
+          <option v-for="item in seriesForBrand" :key="item" :value="item">{{ item }}</option>
+        </select>
+      </label>
+
+      <label class="field">
+        <span>排氣量</span>
+        <select
+          :value="bucketKey"
+          required
+          :disabled="!series"
+          @change="selectBucket(($event.target as HTMLSelectElement).value)"
+        >
+          <option value="" disabled>請選擇排氣量</option>
+          <option v-for="bucket in bucketsForSeries" :key="bucket.key" :value="bucket.key">
+            {{ bucket.label }}
+          </option>
+        </select>
+      </label>
+    </template>
+
     <label class="field">
-      <span>車型</span>
+      <span>名稱</span>
       <select
         v-if="!manualModel"
         :value="model"
         required
-        :disabled="!brand"
+        :disabled="!bucketKey"
         @change="selectModel(($event.target as HTMLSelectElement).value)"
       >
-        <option value="" disabled>請選擇車型</option>
-        <option v-for="item in modelsForBrand" :key="item.id" :value="item.model">
-          {{ item.model }}
+        <option value="" disabled>請選擇名稱</option>
+        <option v-for="item in optionsForBucket" :key="item.id" :value="item.name">
+          {{ item.name }}
         </option>
-        <option value="__manual__">找不到我的車型，手動輸入</option>
+        <option value="__manual__">找不到我的名稱，手動輸入</option>
       </select>
-      <input v-else v-model="model" type="text" placeholder="車型，例如 勁戰六代" required />
+      <input v-else v-model="model" type="text" placeholder="名稱，例如 勁戰六代" required />
     </label>
 
     <button
diff --git a/src/components/verification/BasicHealthCheck13.vue b/src/components/verification/BasicHealthCheck13.vue
index d63d0e1..77493f7 100644
--- a/src/components/verification/BasicHealthCheck13.vue
+++ b/src/components/verification/BasicHealthCheck13.vue
@@ -15,6 +15,7 @@ import AppHeader from '@/components/common/AppHeader.vue'
 import PrimaryButton from '@/components/common/PrimaryButton.vue'
 import { BIKE_REFERENCE_PHOTO } from './basic-health-check-photo'
 
+const props = defineProps<{ hasChain?: boolean | null }>()
 const emit = defineEmits<{ back: [] }>()
 
 interface ChecklistItem {
@@ -28,7 +29,7 @@ interface ChecklistItem {
   required: boolean
 }
 
-const ITEMS: ChecklistItem[] = [
+const BASE_ITEMS: ChecklistItem[] = [
   { key: 'headlight', label: '大燈', anchor: [20.5, 38.0], page: 1, required: true },
   { key: 'turnsignal', label: '方向燈',
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 681b2b2

#### 時數
1.1

---

### 通知中心支援訊息來源合併顯示、右滑刪除與清除全部 `dccc8f1`

- 使用者：Archi
- 時間：2026-09-09 15:50
- 分類：系統
- 類型：功能

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
同一則對話的訊息通知只顯示最新一筆（收合其餘），僅取最新 40 筆通知；
每筆通知可右滑刪除，並新增清除全部功能，Firestore 規則同步開放刪除權限。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/firestore.rules b/firestore.rules
index 1ad7df9..cc29f65 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -403,12 +403,14 @@ service cloud.firestore {
 
       // Written only by Cloud Functions Firestore triggers (Admin SDK,
       // bypasses these rules) — see functions/src/functions/notifications/.
-      // The client may read its own feed and flip `read`, nothing else.
+      // The client may read its own feed, flip `read`, and delete its own
+      // (swipe-to-delete / 清除全部 in NotificationsView.vue) — never create.
       match /notifications/{notificationId} {
         allow read: if signedIn() && myUid() == userId;
         allow update: if signedIn() && myUid() == userId
           && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
-        allow create, delete: if false;
+        allow delete: if signedIn() && myUid() == userId;
+        allow create: if false;
       }
     }
 
diff --git a/src/services/firebase/notification.service.ts b/src/services/firebase/notification.service.ts
index 5804ba9..21860eb 100644
--- a/src/services/firebase/notification.service.ts
+++ b/src/services/firebase/notification.service.ts
@@ -1,5 +1,6 @@
 import {
   collection,
+  deleteDoc,
   doc,
   limit,
   onSnapshot,
@@ -14,7 +15,10 @@ import {
 import { db } from './firebase'
 import type { AppNotification, NotificationType } from '@/types/notification'
 
-const PAGE_SIZE = 50
+/** NotificationsView.vue only ever shows the latest 40 (its own requirement,
+ *  independent of any client-side grouping/dedup it does on top of this
+ *  raw feed) — no pagination UI exists beyond that. */
+const PAGE_SIZE = 40
 
 interface NotificationDoc {
   type: NotificationType
@@ -64,13 +68,40 @@ async function markAsRead(uid: string, notificationId: string): Promise<void> {
   await updateDoc(doc(notificationsCollection(uid), notificationId), { read: true })
 }
 
-async function markAllAsRead(uid: string, unreadIds: string[]): Promise<void> {
-  if (unreadIds.length === 0) return
+/** Also used to mark every notification underneath a collapsed 訊息 group as
+ *  read at once (NotificationsView.vue), not just "mark all as read" — the
+ *  name stays generic since both call sites just want "these specific ids,
+ *  flipped to read". */
+async function markManyAsRead(uid: string, ids: string[]): Promise<void> {
+  if (ids.length === 0) return
   const batch = writeBatch(db)
-  for (const id of unreadIds) {
+  for (const id of ids) {
     batch.update(doc(notificationsCollection(uid), id), { read: true })
   }
   await batch.commit()
 }
 
-export const notificationService = { subscribeNotifications, markAsRead, markAllAsRead }
+async function deleteOne(uid: string, notificationId: string): Promise<void> {
+  await deleteDoc(doc(notificationsCollection(uid), notificationId))
+}
+
+/** Swipe-to-delete on a collapsed 訊息 group deletes every underlying doc it
+ *  represents, not just the one shown — otherwise an older hidden message
+ *  from the same conversation would "resurface" after the visible one is
+ *  removed. Also backs 清除全部. */
+async function deleteMany(uid: string, ids: string[]): Promise<void> {
+  if (ids.length === 0) return
+  const batch = writeBatch(db)
+  for (const id of ids) {
+    batch.delete(doc(notificationsCollection(uid), id))
+  }
+  await batch.commit()
+}
+
+export const notificationService = {
+  subscribeNotifications,
+  markAsRead,
+  markManyAsRead,
+  deleteOne,
+  deleteMany,
+}
diff --git a/src/stores/notification.store.ts b/src/stores/notification.store.ts
index 1e49132..3924535 100644
--- a/src/stores/notification.store.ts
+++ b/src/stores/notification.store.ts
@@ -39,10 +39,36 @@ export const useNotificationStore = defineStore('notification', () => {
     await notificationService.markAsRead(currentUid.value, notificationId)
   }
 
+  /** Marks a specific set of ids as read — a collapsed 訊息 group's every
+   *  underlying id, not just the one shown (see NotificationsView.vue). */
+  async function markManyAsRead(ids: string[]): Promise<void> {
+    if (!currentUid.value) return
+    await notificationService.markManyAsRead(currentUid.value, ids)
+  }
+
   async function markAllAsRead(): Promise<void> {
     if (!currentUid.value) return
     const unreadIds = notifications.value.filter((n) => !n.read).map((n) => n.id)
-    await notificationService.markAllAsRead(currentUid.value, unreadIds)
+    await notificationService.markManyAsRead(currentUid.value, unreadIds)
+  }
+
+  async function deleteOne(notificationId: string): Promise<void> {
+    if (!currentUid.value) return
+    await notificationService.deleteOne(currentUid.value, notificationId)
+  }
+
+  /** Swipe-to-delete on a collapsed group removes every id it represents. */
+  async function deleteMany(ids: string[]): Promise<void> {
+    if (!currentUid.value) return
+    await notificationService.deleteMany(currentUid.value, ids)
+  }
+
+  async function clearAll(): Promise<void> {
+    if (!currentUid.value) return
+    await notificationService.deleteMany(
+      currentUid.value,
+      notifications.value.map((n) => n.id),
+    )
   }
 
   return {
@@ -52,6 +78,10 @@ export const useNotificationStore = defineStore('notification', () => {
     subscribe,
     stopSubscription,
     markAsRead,
+    markManyAsRead,
     markAllAsRead,
+    deleteOne,
+    deleteMany,
+    clearAll,
   }
 })
diff --git a/src/views/NotificationsView.vue b/src/views/NotificationsView.vue
index 3d6928d..93930be 100644
--- a/src/views/NotificationsView.vue
+++ b/src/views/NotificationsView.vue
@@ -1,5 +1,5 @@
 <script setup lang="ts">
-import { computed } from 'vue'
+import { computed, reactive, ref } from 'vue'
 import {
   Bell,
   Calendar,
@@ -8,6 +8,7 @@ import {
   MessageCircle,
   Newspaper,
   Sparkles,
+  Trash2,
   type LucideIcon,
 } from 'lucide-vue-next'
 import { useRouter } from 'vue-router'
@@ -34,71 +35,186 @@ const ICONS: Record<NotificationType, LucideIcon> = {
   discussion_reply: MessageCircle,
 }
 
-const sorted = computed(() => [...notificationStore.notifications].sort((a, b) => b.createdAt - a.createdAt))
+interface DisplayGroup {
+  /** `link` for a collapsed 訊息 group (one row per conversation), the
+   *  notification's own id otherwise. */
+  key: string
+  /** Every underlying notification id this row represents — 1 for anything
+   *  that isn't a collapsed chat_message group. Read/delete act on all of
+   *  them at once so a hidden older message never "resurfaces". */
+  ids: string[]
+  latest: AppNotification
+  unread: boolean
+}
+
+// chat_message notifications from the same conversation (same `link`)
+// collapse into one row showing only the newest — everything else stays
+// one row per notification, same as before.
+const groups = computed<DisplayGroup[]>(() => {
+  const sorted = [...notificationStore.notifications].sort((a, b) => b.createdAt - a.createdAt)
+  const messageGroupByLink = new Map<string, DisplayGroup>()
+  const result: DisplayGroup[] = []
+
+  for (const n of sorted) {
+    if (n.type === 'chat_message' && n.link) {
+      const existing = messageGroupByLink.get(n.link)
+      if (existing) {
+        existing.ids.push(n.id)
+        existing.unread = existing.unread || !n.read
+        continue
+      }
+      const group: DisplayGroup = { key: n.link, ids: [n.id], latest: n, unread: !n.read }
+      messageGroupByLink.set(n.link, group)
+      result.push(group)
+    } else {
+      result.push({ key: n.id, ids: [n.id], latest: n, unread: !n.read })
+    }
+  }
+  return result
+})
 
-async function handleOpen(notification: AppNotification): Promise<void> {
-  if (!notification.read) await notificationStore.markAsRead(notification.id)
-  if (notification.link) router.push(notification.link)
+async function handleOpen(group: DisplayGroup): Promise<void> {
+  if (group.unread) await notificationStore.markManyAsRead(group.ids)
+  if (group.latest.link) router.push(group.latest.link)
 }
 
 async function handleMarkAllRead(): Promise<void> {
   await notificationStore.markAllAsRead()
 }
+
+async function handleClearAll(): Promise<void> {
+  if (groups.value.length === 0) return
+  if (!window.confirm('清除全部通知？此操作無法復原。')) return
+  await notificationStore.clearAll()
+}
+
+// --- Swipe-right-to-reveal-delete — one row open at a time. A pointer drag
+// that moves more than a few px suppresses the row's own click (so releasing
+// the swipe doesn't also "open" the notification underneath it).
+const REVEAL_WIDTH = 72
+const openKey = ref<string | null>(null)
+const drag = reactive({ key: null as string | null, startX: 0, baseOffset: 0, offset: 0 })
+let dragMoved = false
+
+function offsetFor(key: string): number {
+  if (drag.key === key) return drag.offset
+  return openKey.value === key ? REVEAL_WIDTH : 0
+}
+
+function onPointerDown(key: string, event: PointerEvent): void {
+  drag.key = key
+  drag.startX = event.clientX
+  drag.baseOffset = openKey.value === key ? REVEAL_WIDTH : 0
+  drag.offset = drag.baseOffset
+  dragMoved = false
+  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
+}
+
+function onPointerMove(key: string, event: PointerEvent): void {
+  if (drag.key !== key) return
+  const raw = drag.baseOffset + (event.clientX - drag.startX)
+  drag.offset = Math.min(REVEAL_WIDTH, Math.max(0, raw))
+  if (Math.abs(event.clientX - drag.startX) > 6) dragMoved = true
+}
+
+function endDrag(key: string): void {
+  if (drag.key !== key) return
+  openKey.value = drag.offset > REVEAL_WIDTH / 2 ? key : null
+  drag.key = null
+  drag.offset = 0
+}
+
+function handleRowClick(group: DisplayGroup): void {
+  if (dragMoved) {
+    dragMoved = false
+    return
+  }
+  if (openKey.value === group.key) {
+    openKey.value = null
+    return
+  }
+  void handleOpen(group)
+}
+
+async function handleDelete(group: DisplayGroup): Promise<void> {
+  openKey.value = null
+  await notificationStore.deleteMany(group.ids)
+}
 </script>
 
 <template>
   <div>
     <AppHeader title="通知" back>
       <template #right>
-        <button
-          v-if="notificationStore.unreadCount > 0"
-          class="mark-all-btn"
-          @click="handleMarkAllRead"
-        >
-          全部標為已讀
-        </button>
+        <div class="header-actions">
+          <button v-if="notificationStore.unreadCount > 0" class="text-btn" @click="handleMarkAllRead">
+            全部已讀
+          </button>
+          <button v-if="groups.length > 0" class="text-btn danger" @click="handleClearAll">
+            清除全部
+          </button>
+        </div>
       </template>
     </AppHeader>
 
     <div class="content">
       <p v-if="!notificationStore.loaded" class="state-text">載入中...</p>
       <EmptyState
-        v-else-if="sorted.length === 0"
+        v-else-if="groups.length === 0"
         :icon="Bell"
         title="還沒有通知"
         description="有新的訊息、收藏、留言或系統公告時，會顯示在這裡。"
       />
       <div v-else class="list">
-        <button
-          v-for="n in sorted"
-          :key="n.id"
-          class="row"
-          :class="{ unread: !n.read }"
-          @click="handleOpen(n)"
-        >
-          <div class="icon-wrap">
-            <component :is="ICONS[n.type]" :size="18" color="var(--color-primary)" />
-          </div>
-          <div class="info">
-            <p class="title">{{ n.title }}</p>
-            <p class="body">{{ n.body }}</p>
-            <p class="time">{{ formatRelativeTime(n.createdAt) }}</p>
-          </div>
-          <span v-if="!n.read" class="dot" />
-        </button>
+        <div v-for="group in groups" :key="group.key" class="swipe-wrap">
+          <button class="delete-action" aria-label="刪除通知" @click="handleDelete(group)">
+            <Trash2 :size="18" color="#fff" />
+          </button>
+          <button
+            class="row"
+            :class="{ unread: group.unread }"
+            :style="{ transform: `translateX(${offsetFor(group.key)}px)` }"
+            @pointerdown="onPointerDown(group.key, $event)"
+            @pointermove="onPointerMove(group.key, $event)"
+            @pointerup="endDrag(group.key)"
+            @pointercancel="endDrag(group.key)"
+            @click="handleRowClick(group)"
+          >
+            <div class="icon-wrap">
+              <component :is="ICONS[group.latest.type]" :size="18" color="var(--color-primary)" />
+            </div>
+            <div class="info">
+              <p class="title">{{ group.latest.title }}</p>
+              <p class="body">{{ group.latest.body }}</p>
+              <p class="time">{{ formatRelativeTime(group.latest.createdAt) }}</p>
+            </div>
+            <span v-if="group.unread" class="dot" />
+          </button>
+        </div>
       </div>
     </div>
   </div>
 </template>
 
 <style scoped>
-.mark-all-btn {
+.header-actions {
+  display: flex;
+  align-items: center;
+  gap: var(--space-md);
+}
+
+.text-btn {
   border: none;
   background: none;
   color: var(--color-primary);
   font-size: 12.5px;
   font-weight: 700;
   padding: 0;
+  white-space: nowrap;
+}
+
+.text-btn.danger {
+  color: var(--color-danger);
 }
 
 .content {
@@ -118,8 +234,26 @@ async function handleMarkAllRead(): Promise<void> {
   gap: var(--space-sm);
 }
 
+.swipe-wrap {
+  position: relative;
+  overflow: hidden;
+  border-radius: var(--radius-lg);
+}
+
+.delete-action {
+  position: absolute;
+  inset: 0;
+  width: 72px;
+  border: none;
+  background: var(--color-danger);
+  display: flex;
+  align-items: center;
+  justify-content: center;
+}
+
 .row {
   position: relative;
+  width: 100%;
   display: flex;
   align-items: flex-start;
   gap: var(--space-sm);
@@ -128,6 +262,8 @@ async function handleMarkAllRead(): Promise<void> {
   border: 1px solid var(--color-border);
   border-radius: var(--radius-lg);
   text-align: left;
+  touch-action: pan-y;
+  transition: transform 0.15s ease;
 }
 
 .row.unread {
```

</details>

#### 結果
已提交 commit dccc8f1

#### 時數
0

---

### 通知列表刪除手勢改為左滑（考量多數使用者慣用右手） `87e43f1`

- 使用者：Archi
- 時間：2026-09-09 16:10
- 分類：前台
- 類型：修復

#### Prompt
考量到多數使用者是右撇子的關係，把「右滑」改為「左滑」

#### 摘要
刪除按鈕改為顯示在列右側，向左滑動觸發，符合右手拇指自然滑動方向。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/views/NotificationsView.vue b/src/views/NotificationsView.vue
index 93930be..8752283 100644
--- a/src/views/NotificationsView.vue
+++ b/src/views/NotificationsView.vue
@@ -88,9 +88,10 @@ async function handleClearAll(): Promise<void> {
   await notificationStore.clearAll()
 }
 
-// --- Swipe-right-to-reveal-delete — one row open at a time. A pointer drag
-// that moves more than a few px suppresses the row's own click (so releasing
-// the swipe doesn't also "open" the notification underneath it).
+// --- Swipe-left-to-reveal-delete (right-handed users mostly swipe with the
+// thumb moving left, toward the palm) — one row open at a time. A pointer
+// drag that moves more than a few px suppresses the row's own click (so
+// releasing the swipe doesn't also "open" the notification underneath it).
 const REVEAL_WIDTH = 72
 const openKey = ref<string | null>(null)
 const drag = reactive({ key: null as string | null, startX: 0, baseOffset: 0, offset: 0 })
@@ -98,13 +99,13 @@ let dragMoved = false
 
 function offsetFor(key: string): number {
   if (drag.key === key) return drag.offset
-  return openKey.value === key ? REVEAL_WIDTH : 0
+  return openKey.value === key ? -REVEAL_WIDTH : 0
 }
 
 function onPointerDown(key: string, event: PointerEvent): void {
   drag.key = key
   drag.startX = event.clientX
-  drag.baseOffset = openKey.value === key ? REVEAL_WIDTH : 0
+  drag.baseOffset = openKey.value === key ? -REVEAL_WIDTH : 0
   drag.offset = drag.baseOffset
   dragMoved = false
   ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
@@ -113,13 +114,13 @@ function onPointerDown(key: string, event: PointerEvent): void {
 function onPointerMove(key: string, event: PointerEvent): void {
   if (drag.key !== key) return
   const raw = drag.baseOffset + (event.clientX - drag.startX)
-  drag.offset = Math.min(REVEAL_WIDTH, Math.max(0, raw))
+  drag.offset = Math.max(-REVEAL_WIDTH, Math.min(0, raw))
   if (Math.abs(event.clientX - drag.startX) > 6) dragMoved = true
 }
 
 function endDrag(key: string): void {
   if (drag.key !== key) return
-  openKey.value = drag.offset > REVEAL_WIDTH / 2 ? key : null
+  openKey.value = drag.offset < -REVEAL_WIDTH / 2 ? key : null
   drag.key = null
   drag.offset = 0
 }
@@ -242,7 +243,9 @@ async function handleDelete(group: DisplayGroup): Promise<void> {
 
 .delete-action {
   position: absolute;
-  inset: 0;
+  top: 0;
+  right: 0;
+  bottom: 0;
   width: 72px;
   border: none;
   background: var(--color-danger);
```

</details>

#### 結果
已提交 commit 87e43f1

#### 時數
0

---

### 刊登表單的傳動（外露鏈條）改為依車輛型號資料自動判斷 `d8d1e29`

- 使用者：Archi
- 時間：2026-09-09 16:18
- 分類：前台
- 類型：功能

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
車輛型號資料已含鏈條傳動欄位（CSV 匯入），選車後直接帶入，不再需要賣家自行勾選；
僅在該車輛型號沒有鏈條資料時，才保留手動選擇。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/views/MyListingsView.vue b/src/views/MyListingsView.vue
index afa9965..0c1f7c6 100644
--- a/src/views/MyListingsView.vue
+++ b/src/views/MyListingsView.vue
@@ -109,6 +109,20 @@ const selectedVehicleEntry = computed(
   () => eligibleVehicles.value.find((entry) => entry.vehicle.id === form.vehicleId) ?? null,
 )
 
+// hasChain comes from the vehicle's model data (CSV import, see
+// scripts/import-vehicle-models-csv.mjs) — when known, trust it instead of
+// asking the seller to identify their own drivetrain.
+const chainKnownFromVehicle = computed(() => {
+  const hasChain = selectedVehicleEntry.value?.vehicle.hasChain
+  return hasChain === true || hasChain === false
+})
+
+watch(selectedVehicleEntry, (entry) => {
+  if (entry?.vehicle.hasChain === true) form.transmission = TRANSMISSION_CHAIN_EXPOSED
+  else if (entry?.vehicle.hasChain === false) form.transmission = TRANSMISSION_NO_EXPOSED_CHAIN
+  else form.transmission = ''
+})
+
 const canSubmit = computed(
   () =>
     !submitting.value &&
@@ -282,7 +296,10 @@ async function handleSubmit(): Promise<void> {
 
           <div class="field">
             <span>傳動</span>
-            <div class="segmented-control">
+            <p v-if="chainKnownFromVehicle" class="hint">
+              {{ form.transmission }}（依車輛型號資料自動判斷）
+            </p>
+            <div v-else class="segmented-control">
               <button
                 type="button"
                 class="segment"
```

</details>

#### 結果
已提交 commit d8d1e29

#### 時數
0.1

---

### 後台新增「資料維護／車輛選單資訊」的編輯與搜尋功能 `2c839f1`

- 使用者：Archi
- 時間：2026-09-09 16:29
- 分類：後台
- 類型：功能

#### Prompt
我有多新增資料，另外在https://motorcycle-verification.web.app/admin/多新增一個項目是資料維護（data maintenance)/ 車輛選單資訊（bike list info），讓後台管理員可以透過後台新增、維護清單

#### 摘要
車輛選單資訊沿用既有 vehicleModels 主檔（原「車款主檔」），補上編輯（原僅新增/刪除）
與依廠牌/車系/名稱搜尋；並更新導覽列命名與說明文字，反映此主檔已被
VehicleModelSelect 選單與刊登表單的鏈條判斷實際讀取的事實。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/AdminDashboardView.vue b/src/admin/AdminDashboardView.vue
index e937ef1..99fcdc0 100644
--- a/src/admin/AdminDashboardView.vue
+++ b/src/admin/AdminDashboardView.vue
@@ -46,7 +46,7 @@ const NAV_GROUPS: NavGroup[] = [
       { key: 'probe', label: 'Probe 裝置' },
     ],
   },
-  { title: '主資料與內容', items: [{ key: 'models', label: '車款主檔' }] },
+  { title: '資料維護', items: [{ key: 'models', label: '車輛選單資訊' }] },
   { title: '系統設定', items: [{ key: 'prompts', label: 'AI Prompt 設定' }] },
 ]
 
@@ -65,7 +65,7 @@ const TITLES: Record<string, [string, string]> = {
   news: ['車訊新知', 'collection: vehicleNews'],
   notifications: ['系統通知', 'collection: systemAnnouncements（廣播給所有使用者）'],
   probe: ['Probe 裝置', 'collection: voltageSessions（目前無寫入來源）'],
-  models: ['車款主檔', 'collection: vehicleModels（新建）'],
+  models: ['車輛選單資訊', 'collection: vehicleModels'],
   prompts: ['AI Prompt 設定', 'collection: aiPrompts（新建，覆寫 functions 端預設值）'],
 }
 
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index dc3480e..adbb999 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -1,10 +1,11 @@
 <script setup lang="ts">
-import { onMounted, reactive, ref } from 'vue'
+import { computed, onMounted, reactive, ref } from 'vue'
 
 import {
   createVehicleModel,
   deleteVehicleModel,
   listVehicleModels,
+  updateVehicleModel,
   type AdminVehicleModel,
 } from '../services/admin-data.service'
 
@@ -12,6 +13,19 @@ const loading = ref(true)
 const models = ref<AdminVehicleModel[]>([])
 const formOpen = ref(false)
 const submitting = ref(false)
+const editingId = ref<string | null>(null)
+const searchText = ref('')
+
+const filteredModels = computed(() => {
+  const q = searchText.value.trim().toLowerCase()
+  if (!q) return models.value
+  return models.value.filter((m) =>
+    [m.brand, m.series, m.trimName ?? '', m.bodyType ?? '']
+      .join(' ')
+      .toLowerCase()
+      .includes(q),
+  )
+})
 
 const draft = reactive({
   brand: '',
@@ -65,11 +79,53 @@ async function reload(): Promise<void> {
   models.value = await listVehicleModels()
 }
 
-async function handleCreate(): Promise<void> {
+function openCreateForm(): void {
+  editingId.value = null
+  resetDraft()
+  formOpen.value = true
+}
+
+function openEditForm(model: AdminVehicleModel): void {
+  editingId.value = model.id
+  draft.brand = model.brand
+  draft.series = model.series
+  draft.modelYear = model.modelYear != null ? String(model.modelYear) : ''
+  draft.trimName = model.trimName ?? ''
+  draft.bodyType = model.bodyType ?? ''
+  draft.powerType = model.powerType
+  draft.displacementCc = model.displacementCc != null ? String(model.displacementCc) : ''
+  draft.transmission = model.transmission ?? ''
+  draft.hasChain = model.hasChain
+  draft.maxPowerHp = model.specs.engine.maxPowerHp != null ? String(model.specs.engine.maxPowerHp) : ''
+  draft.maxTorqueKgm =
+    model.specs.engine.maxTorqueKgm != null ? String(model.specs.engine.maxTorqueKgm) : ''
+  draft.fuelTankCapacityL =
+    model.specs.engine.fuelTankCapacityL != null ? String(model.specs.engine.fuelTankCapacityL) : ''
+  draft.motorPowerW = model.specs.electric.motorPowerW != null ? String(model.specs.electric.motorPowerW) : ''
+  draft.weightKg = model.specs.dimensions.weightKg != null ? String(model.specs.dimensions.weightKg) : ''
+  draft.seatHeightMm =
+    model.specs.dimensions.seatHeightMm != null ? String(model.specs.dimensions.seatHeightMm) : ''
+  draft.officialAverageKmPerL =
+    model.specs.efficiency.officialAverageKmPerL != null
+      ? String(model.specs.efficiency.officialAverageKmPerL)
+      : ''
+  draft.abs = model.specs.safety.abs
+  draft.tcs = model.specs.safety.tcs
+  draft.cbs = model.specs.safety.cbs
+  formOpen.value = true
+}
+
+function closeForm(): void {
+  formOpen.value = false
+  editingId.value = null
+  resetDraft()
+}
+
+async function handleSubmit(): Promise<void> {
   if (!draft.brand.trim() || !draft.series.trim()) return
   submitting.value = true
   try {
-    await createVehicleModel({
+    const input = {
       brand: draft.brand.trim(),
       series: draft.series.trim(),
       modelYear: numberOrNull(draft.modelYear),
@@ -91,9 +147,13 @@ async function handleCreate(): Promise<void> {
         tcs: draft.tcs,
         cbs: draft.cbs,
       },
-    })
-    resetDraft()
-    formOpen.value = false
+    }
+    if (editingId.value) {
+      await updateVehicleModel(editingId.value, input)
+    } else {
+      await createVehicleModel(input)
+    }
+    closeForm()
     await reload()
   } finally {
     submitting.value = false
@@ -101,7 +161,9 @@ async function handleCreate(): Promise<void> {
 }
 
 async function handleDelete(id: string): Promise<void> {
+  if (!window.confirm('刪除這筆車款資料？')) return
   await deleteVehicleModel(id)
+  if (editingId.value === id) closeForm()
   await reload()
 }
 
@@ -114,19 +176,24 @@ onMounted(async () => {
 <template>
   <div>
     <p class="admin-page-intro">
-      車款主檔（<code>vehicleModels</code>）。app
-      端目前沒有任何地方讀取或寫入它——車輛的品牌／車型是使用者在建立車輛/刊登時自行輸入的自由文字，
-      沒有經過這份主檔比對或校正。這裡先提供規格資料的新增/檢視/刪除；要讓它真正「發揮作用」（例如統一寫法、擋掉亂填的車型字串），還需要
-      app
-      端改成從這份主檔選擇，而不是自由輸入，詳見後台彙報。convenience/display/lighting/storage/security
+      車輛選單資訊（<code>vehicleModels</code>）——「我的車輛」新增車輛時的廠牌／車系／排氣量／名稱四層選單，
+      以及刊登表單的鏈條傳動判斷，都是直接讀取這份主檔（見
+      <code>src/components/common/VehicleModelSelect.vue</code>）。在這裡新增、修改或刪除的車款，會立即反映在
+      App 的選單裡。convenience/display/lighting/storage/security
       等配備旗標與 fuelReports/reviews 統計目前無填寫介面，欄位保留預設值。
     </p>
 
     <div class="admin-panel">
       <div class="admin-panel-head">
         <h2>標準車款規格</h2>
+        <input
+          v-model="searchText"
+          type="search"
+          class="admin-search"
+          placeholder="搜尋廠牌、車系、名稱..."
+        />
         <div class="spacer"></div>
-        <button class="admin-btn sm primary" @click="formOpen = !formOpen">
+        <button class="admin-btn sm primary" @click="formOpen ? closeForm() : openCreateForm()">
           {{ formOpen ? '取消' : '新增車款' }}
         </button>
       </div>
@@ -217,9 +284,9 @@ onMounted(async () => {
           class="admin-btn primary"
           style="margin-top: 12px"
           :disabled="submitting"
-          @click="handleCreate"
+          @click="handleSubmit"
         >
-          {{ submitting ? '新增中...' : '新增' }}
+          {{ submitting ? '儲存中...' : editingId ? '儲存修改' : '新增' }}
         </button>
       </div>
 
@@ -236,10 +303,10 @@ onMounted(async () => {
             </tr>
           </thead>
           <tbody>
-            <tr v-if="!loading && models.length === 0">
+            <tr v-if="!loading && filteredModels.length === 0">
               <td class="admin-empty-cell" colspan="6">尚無資料</td>
             </tr>
-            <tr v-for="m in models" :key="m.id">
+            <tr v-for="m in filteredModels" :key="m.id">
               <td class="strong">
                 {{ m.brand }} {{ m.series }}<span v-if="m.trimName"> {{ m.trimName }}</span>
                 <span v-if="m.modelYear" class="dim"> ({{ m.modelYear }})</span>
@@ -248,7 +315,10 @@ onMounted(async () => {
               <td class="dim">{{ m.powerType === 'electric' ? '電動' : '燃油' }}</td>
               <td class="num dim">{{ m.displacementCc ?? '—' }}</td>
               <td class="num dim">{{ m.specs.engine.maxPowerHp ?? '—' }}</td>
-              <td><button class="admin-btn sm danger" @click="handleDelete(m.id)">刪除</button></td>
+              <td class="admin-row-actions">
+                <button class="admin-btn sm" @click="openEditForm(m)">編輯</button>
+                <button class="admin-btn sm danger" @click="handleDelete(m.id)">刪除</button>
+              </td>
             </tr>
           </tbody>
         </table>
@@ -272,4 +342,17 @@ onMounted(async () => {
   font-size: 13px;
   font-weight: 600;
 }
+
+.admin-search {
+  width: 220px;
+  padding: 6px 10px;
+  border: 1px solid var(--line-soft);
+  border-radius: 8px;
+  font-size: 13px;
+}
+
+.admin-row-actions {
+  display: flex;
+  gap: 8px;
+}
 </style>
diff --git a/src/admin/services/admin-data.service.ts b/src/admin/services/admin-data.service.ts
index 337f2eb..f18fb6a 100644
--- a/src/admin/services/admin-data.service.ts
+++ b/src/admin/services/admin-data.service.ts
@@ -548,6 +548,44 @@ export async function createVehicleModel(input: CreateVehicleModelInput): Promis
   })
 }
 
+export async function updateVehicleModel(
+  id: string,
+  input: CreateVehicleModelInput,
+): Promise<void> {
+  const specs: VehicleModelSpecs = {
+    ...EMPTY_SPECS,
+    engine: {
+      ...EMPTY_SPECS.engine,
+      maxPowerHp: input.specs.maxPowerHp,
+      maxTorqueKgm: input.specs.maxTorqueKgm,
+      fuelTankCapacityL: input.specs.fuelTankCapacityL,
+    },
+    electric: { ...EMPTY_SPECS.electric, motorPowerW: input.specs.motorPowerW },
+    dimensions: {
+      ...EMPTY_SPECS.dimensions,
+      weightKg: input.specs.weightKg,
+      seatHeightMm: input.specs.seatHeightMm,
+    },
+    safety: { abs: input.specs.abs, tcs: input.specs.tcs, cbs: input.specs.cbs },
+    efficiency: {
+      ...EMPTY_SPECS.efficiency,
+      officialAverageKmPerL: input.specs.officialAverageKmPerL,
+    },
+  }
+  await updateDoc(doc(db, 'vehicleModels', id), {
+    brand: input.brand,
+    series: input.series,
+    modelYear: input.modelYear,
+    trimName: input.trimName,
+    bodyType: input.bodyType,
+    powerType: input.powerType,
+    displacementCc: input.displacementCc,
+    transmission: input.transmission,
+    hasChain: input.hasChain,
+    specs,
+  })
+}
+
 export async function deleteVehicleModel(id: string): Promise<void> {
   await deleteDoc(doc(db, 'vehicleModels', id))
 }
```

</details>

#### 結果
已提交 commit 2c839f1

#### 時數
0.1

---

### 車輛選單資訊新增「同義詞」與「範例圖片上傳」欄位 `77696fc`

- 使用者：Archi
- 時間：2026-09-09 17:17
- 分類：後台
- 類型：功能

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
同義詞以頓號/逗號分隔輸入，存為字串陣列；範例圖片上傳後壓縮並寫入既有的
coverImageUrl 欄位（沿用 storage.rules 中 vehicleModels/{id} 的 admin 寫入權限）。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index adbb999..bc5dc26 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -1,13 +1,16 @@
 <script setup lang="ts">
-import { computed, onMounted, reactive, ref } from 'vue'
+import { computed, onMounted, reactive, ref, watch } from 'vue'
 
 import {
   createVehicleModel,
   deleteVehicleModel,
   listVehicleModels,
+  setVehicleModelCoverImage,
   updateVehicleModel,
   type AdminVehicleModel,
 } from '../services/admin-data.service'
+import { storageService } from '@/services/firebase/storage.service'
+import { imageCompressionService } from '@/services/media/image-compression.service'
 
 const loading = ref(true)
 const models = ref<AdminVehicleModel[]>([])
@@ -37,6 +40,7 @@ const draft = reactive({
   displacementCc: '',
   transmission: '',
   hasChain: false,
+  synonymsText: '',
   maxPowerHp: '',
   maxTorqueKgm: '',
   fuelTankCapacityL: '',
@@ -49,6 +53,37 @@ const draft = reactive({
   cbs: false,
 })
 
+// admin-typed sample photo for this model (see storageService.uploadVehicleModelPhoto) —
+// separate from `draft` since a File isn't something v-model on a plain
+// reactive object round-trips cleanly.
+const photoFile = ref<File | null>(null)
+const existingCoverImageUrl = ref<string | null>(null)
+const photoPreviewUrl = ref<string | null>(null)
+
+watch(photoFile, (file, _prev, onCleanup) => {
+  if (!file) {
+    photoPreviewUrl.value = null
+    return
+  }
+  const url = URL.createObjectURL(file)
+  photoPreviewUrl.value = url
+  onCleanup(() => URL.revokeObjectURL(url))
+})
+
+function handlePhotoChange(event: Event): void {
+  const input = event.target as HTMLInputElement
+  photoFile.value = input.files?.[0] ?? null
+}
+
+const SYNONYM_SEPARATOR = /[、,，]/
+
+function parseSynonyms(text: string): string[] {
+  return text
+    .split(SYNONYM_SEPARATOR)
+    .map((s) => s.trim())
+    .filter((s) => s.length > 0)
+}
+
 function resetDraft(): void {
   draft.brand = ''
   draft.series = ''
@@ -59,6 +94,7 @@ function resetDraft(): void {
   draft.displacementCc = ''
   draft.transmission = ''
   draft.hasChain = false
+  draft.synonymsText = ''
   draft.maxPowerHp = ''
   draft.maxTorqueKgm = ''
   draft.fuelTankCapacityL = ''
@@ -69,6 +105,8 @@ function resetDraft(): void {
   draft.abs = false
   draft.tcs = false
   draft.cbs = false
+  photoFile.value = null
+  existingCoverImageUrl.value = null
 }
 
 function numberOrNull(value: string): number | null {
@@ -112,6 +150,9 @@ function openEditForm(model: AdminVehicleModel): void {
   draft.abs = model.specs.safety.abs
   draft.tcs = model.specs.safety.tcs
   draft.cbs = model.specs.safety.cbs
+  draft.synonymsText = model.synonyms.join('、')
+  photoFile.value = null
+  existingCoverImageUrl.value = model.coverImageUrl
   formOpen.value = true
 }
 
@@ -135,6 +176,7 @@ async function handleSubmit(): Promise<void> {
       displacementCc: numberOrNull(draft.displacementCc),
       transmission: draft.transmission.trim() || null,
       hasChain: draft.hasChain,
+      synonyms: parseSynonyms(draft.synonymsText),
       specs: {
         maxPowerHp: numberOrNull(draft.maxPowerHp),
         maxTorqueKgm: numberOrNull(draft.maxTorqueKgm),
@@ -148,10 +190,12 @@ async function handleSubmit(): Promise<void> {
         cbs: draft.cbs,
       },
     }
-    if (editingId.value) {
-      await updateVehicleModel(editingId.value, input)
-    } else {
-      await createVehicleModel(input)
+    const id = editingId.value ?? (await createVehicleModel(input))
+    if (editingId.value) await updateVehicleModel(editingId.value, input)
+    if (photoFile.value) {
+      const { blob } = await imageCompressionService.compressImage(photoFile.value)
+      const url = await storageService.uploadVehicleModelPhoto(id, blob)
+      await setVehicleModelCoverImage(id, url)
     }
     closeForm()
     await reload()
@@ -244,6 +288,25 @@ onMounted(async () => {
         <div class="admin-form-row" style="margin-top: 10px">
           <label class="admin-check"><input v-model="draft.hasChain" type="checkbox" /> 鏈條傳動</label>
         </div>
+        <div class="admin-form-row" style="margin-top: 10px">
+          <label class="admin-field admin-field-wide">
+            <span>同義詞</span>
+            <input
+              v-model="draft.synonymsText"
+              type="text"
+              placeholder="以頓號分隔，例如：山葉100、老山葉、迅光100"
+            />
+          </label>
+        </div>
+        <div class="admin-form-row" style="margin-top: 10px; align-items: flex-end">
+          <label class="admin-field">
+            <span>範例圖片上傳</span>
+            <input type="file" accept="image/*" @change="handlePhotoChange" />
+          </label>
+          <div v-if="photoPreviewUrl || existingCoverImageUrl" class="admin-photo-preview">
+            <img :src="photoPreviewUrl ?? existingCoverImageUrl!" alt="" />
+          </div>
+        </div>
 
         <p class="admin-form-subhead">規格（選填）</p>
         <div class="admin-form-row">
@@ -351,6 +414,25 @@ onMounted(async () => {
   font-size: 13px;
 }
 
+.admin-field-wide {
+  flex: 1 1 100%;
+}
+
+.admin-photo-preview {
+  width: 64px;
+  height: 64px;
+  border-radius: 8px;
+  overflow: hidden;
+  border: 1px solid var(--line-soft);
+  flex-shrink: 0;
+}
+
+.admin-photo-preview img {
+  width: 100%;
+  height: 100%;
+  object-fit: cover;
+}
+
 .admin-row-actions {
   display: flex;
   gap: 8px;
diff --git a/src/admin/services/admin-data.service.ts b/src/admin/services/admin-data.service.ts
index f18fb6a..7e8f3a4 100644
--- a/src/admin/services/admin-data.service.ts
+++ b/src/admin/services/admin-data.service.ts
@@ -393,6 +393,9 @@ export interface AdminVehicleModel {
    * picks this model, which in turn drives whether BasicHealthCheck13.vue's
    * checklist includes the 鏈條 item. */
   hasChain: boolean
+  /** Alternate/colloquial names for this model (e.g. 山葉100、老山葉). Reference
+   * data only for now — nothing in the app reads it yet. */
+  synonyms: string[]
   coverImageUrl: string | null
   photos: string[]
   specs: VehicleModelSpecs
@@ -472,6 +475,7 @@ export async function listVehicleModels(): Promise<AdminVehicleModel[]> {
       displacementCc: data.displacementCc ?? null,
       transmission: data.transmission ?? null,
       hasChain: data.hasChain ?? false,
+      synonyms: data.synonyms ?? [],
       coverImageUrl: data.coverImageUrl ?? null,
       photos: data.photos ?? [],
       specs: { ...EMPTY_SPECS, ...data.specs },
@@ -493,6 +497,7 @@ export interface CreateVehicleModelInput {
   displacementCc: number | null
   transmission: string | null
   hasChain: boolean
+  synonyms: string[]
   specs: {
     maxPowerHp: number | null
     maxTorqueKgm: number | null
@@ -507,7 +512,7 @@ export interface CreateVehicleModelInput {
   }
 }
 
-export async function createVehicleModel(input: CreateVehicleModelInput): Promise<void> {
+export async function createVehicleModel(input: CreateVehicleModelInput): Promise<string> {
   const specs: VehicleModelSpecs = {
     ...EMPTY_SPECS,
     engine: {
@@ -528,7 +533,7 @@ export async function createVehicleModel(input: CreateVehicleModelInput): Promis
       officialAverageKmPerL: input.specs.officialAverageKmPerL,
     },
   }
-  await addDoc(collection(db, 'vehicleModels'), {
+  const ref = await addDoc(collection(db, 'vehicleModels'), {
     brand: input.brand,
     series: input.series,
     modelYear: input.modelYear,
@@ -538,6 +543,7 @@ export async function createVehicleModel(input: CreateVehicleModelInput): Promis
     displacementCc: input.displacementCc,
     transmission: input.transmission,
     hasChain: input.hasChain,
+    synonyms: input.synonyms,
     coverImageUrl: null,
     photos: [],
     specs,
@@ -546,6 +552,7 @@ export async function createVehicleModel(input: CreateVehicleModelInput): Promis
     reviewStats: { averageRating: null, reviewCount: 0 },
     createdAt: serverTimestamp(),
   })
+  return ref.id
 }
 
 export async function updateVehicleModel(
@@ -582,10 +589,15 @@ export async function updateVehicleModel(
     displacementCc: input.displacementCc,
     transmission: input.transmission,
     hasChain: input.hasChain,
+    synonyms: input.synonyms,
     specs,
   })
 }
 
+export async function setVehicleModelCoverImage(id: string, coverImageUrl: string): Promise<void> {
+  await updateDoc(doc(db, 'vehicleModels', id), { coverImageUrl })
+}
+
 export async function deleteVehicleModel(id: string): Promise<void> {
   await deleteDoc(doc(db, 'vehicleModels', id))
 }
diff --git a/src/services/firebase/storage.service.ts b/src/services/firebase/storage.service.ts
index c04fc8e..13a3f12 100644
--- a/src/services/firebase/storage.service.ts
+++ b/src/services/firebase/storage.service.ts
@@ -103,6 +103,13 @@ async function uploadVehicleRegistrationDocument(
   )
 }
 
+/** Admin-curated 車輛選單資訊 sample photo (see admin/sections/ModelsSection.vue).
+ *  Public like marketplace/vehicle photos — storage.rules gates writes to
+ *  admin only for this path. */
+async function uploadVehicleModelPhoto(modelId: string, file: Blob): Promise<string> {
+  return uploadFileAtPath(`vehicleModels/${modelId}/${timestampedName('cover.jpg')}`, file)
+}
+
 export const storageService = {
   uploadFileAtPath,
   uploadPrivateFile,
@@ -113,4 +120,5 @@ export const storageService = {
   uploadDiscussionImage,
   uploadVehiclePhoto,
   uploadVehicleRegistrationDocument,
+  uploadVehicleModelPhoto,
 }
```

</details>

#### 結果
已提交 commit 77696fc

#### 時數
0.8

---

### 修正深色/淺色模式下表單輸入文字顏色不隨主題切換的問題 `4a931d3`

- 使用者：Archi
- 時間：2026-09-09 17:17
- 分類：前台
- 類型：修復

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
input/select/textarea 先前沒有明確設定文字顏色，瀏覽器原生表單控制項的預設
文字顏色不會跟著 app 的 data-theme 走，導致深色模式輸入文字顯示為黑色（在深色
背景上看不到）。全域補上 color: var(--color-text-primary) 並依主題宣告
color-scheme，讓輸入框文字、游標與原生控制項外觀正確跟隨目前主題。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/style.css b/src/style.css
index 5b47f78..fefd063 100644
--- a/src/style.css
+++ b/src/style.css
@@ -26,6 +26,14 @@ input,
 select,
 textarea {
   font-family: inherit;
+  color: var(--color-text-primary);
+  background-color: transparent;
+  accent-color: var(--color-primary);
+}
+
+input::placeholder,
+textarea::placeholder {
+  color: var(--color-text-disabled);
 }
 
 h1,
diff --git a/src/styles/tokens.css b/src/styles/tokens.css
index e122c7a..ab65ac9 100644
--- a/src/styles/tokens.css
+++ b/src/styles/tokens.css
@@ -1,4 +1,6 @@
 :root {
+  color-scheme: light;
+
   /* Color */
   --color-primary: #1769e8;
   --color-primary-dark: #0f1720;
@@ -46,6 +48,8 @@
 }
 
 :root[data-theme='dark'] {
+  color-scheme: dark;
+
   --color-primary: #4c8dff;
   --color-primary-bg: #16233f;
   --color-background: #0e1116;
```

</details>

#### 結果
已提交 commit 4a931d3

#### 時數
0

---

### 車輛選單資訊表單的廠牌/車系/年式/車型類別/傳動系統改為選單輸入 `3ddba69`

- 使用者：Archi
- 時間：2026-09-09 17:24
- 分類：後台
- 類型：功能

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
廠牌、車系（依所選廠牌篩選）、車型類別用 datalist 呈現既有資料可選、也能輸入新值；
年式、傳動系統（原「變速系統」）改為固定選單。選傳動系統為「鏈條」時自動勾選
既有的鏈條傳動核取方塊，核取方塊本身保留、可手動覆寫。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index bc5dc26..af240ea 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -30,6 +30,28 @@ const filteredModels = computed(() => {
   )
 })
 
+// 廠牌/車系/車型類別 are open-ended vocabularies that grow as data is added —
+// a <datalist> lets the admin pick an existing value or type a new one in
+// the same text field, rather than needing a separate "other" escape hatch.
+// 車系 is scoped to the currently-selected brand so it doesn't mix in every
+// other brand's series names.
+const brandOptions = computed(() =>
+  Array.from(new Set(models.value.map((m) => m.brand))).sort(),
+)
+const seriesOptions = computed(() =>
+  Array.from(
+    new Set(models.value.filter((m) => m.brand === draft.brand).map((m) => m.series)),
+  ).sort(),
+)
+const bodyTypeOptions = computed(() =>
+  Array.from(new Set(models.value.map((m) => m.bodyType).filter((v): v is string => !!v))).sort(),
+)
+
+const CURRENT_YEAR = new Date().getFullYear()
+const yearOptions = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => CURRENT_YEAR + 1 - i)
+
+const TRANSMISSION_OPTIONS = ['CVT', '鏈條', '皮帶', '軸傳動']
+
 const draft = reactive({
   brand: '',
   series: '',
@@ -75,6 +97,17 @@ function handlePhotoChange(event: Event): void {
   photoFile.value = input.files?.[0] ?? null
 }
 
+// Picking 鏈條 as the transmission implies chain drive — auto-check the
+// existing 鏈條傳動 box rather than making the admin set both. One-directional
+// on purpose: switching away from 鏈條 afterward doesn't un-check it, since a
+// bike can have an exposed chain independent of its stated transmission type.
+watch(
+  () => draft.transmission,
+  (value) => {
+    if (value === '鏈條') draft.hasChain = true
+  },
+)
+
 const SYNONYM_SEPARATOR = /[、,，]/
 
 function parseSynonyms(text: string): string[] {
@@ -248,25 +281,45 @@ onMounted(async () => {
         style="border-bottom: 1px solid var(--line-soft)"
       >
         <div class="admin-form-row">
-          <label class="admin-field"
-            ><span>廠牌</span><input v-model="draft.brand" type="text" placeholder="HONDA"
-          /></label>
-          <label class="admin-field"
-            ><span>車系</span><input v-model="draft.series" type="text" placeholder="PCX 160"
-          /></label>
-          <label class="admin-field"
-            ><span>年式</span><input v-model="draft.modelYear" type="number" placeholder="2024"
-          /></label>
+          <label class="admin-field">
+            <span>廠牌</span>
+            <input v-model="draft.brand" type="text" list="brand-options" placeholder="HONDA" />
+            <datalist id="brand-options">
+              <option v-for="b in brandOptions" :key="b" :value="b" />
+            </datalist>
+          </label>
+          <label class="admin-field">
+            <span>車系</span>
+            <input v-model="draft.series" type="text" list="series-options" placeholder="PCX 160" />
+            <datalist id="series-options">
+              <option v-for="s in seriesOptions" :key="s" :value="s" />
+            </datalist>
+          </label>
+          <label class="admin-field">
+            <span>年式</span>
+            <select v-model="draft.modelYear">
+              <option value="">未填</option>
+              <option v-for="y in yearOptions" :key="y" :value="String(y)">{{ y }}</option>
+            </select>
+          </label>
         </div>
         <div class="admin-form-row" style="margin-top: 10px">
           <label class="admin-field"
             ><span>版本／配置</span
             ><input v-model="draft.trimName" type="text" placeholder="ABS 版"
           /></label>
-          <label class="admin-field"
-            ><span>車型類別</span
-            ><input v-model="draft.bodyType" type="text" placeholder="速可達 / 街車 / 檔車"
-          /></label>
+          <label class="admin-field">
+            <span>車型類別</span>
+            <input
+              v-model="draft.bodyType"
+              type="text"
+              list="bodytype-options"
+              placeholder="速可達 / 街車 / 打檔車"
+            />
+            <datalist id="bodytype-options">
+              <option v-for="t in bodyTypeOptions" :key="t" :value="t" />
+            </datalist>
+          </label>
           <label class="admin-field">
             <span>動力形式</span>
             <select v-model="draft.powerType">
@@ -280,10 +333,13 @@ onMounted(async () => {
             ><span>排氣量 (cc)</span
             ><input v-model="draft.displacementCc" type="number" placeholder="155"
           /></label>
-          <label class="admin-field"
-            ><span>變速系統</span
-            ><input v-model="draft.transmission" type="text" placeholder="CVT 無段變速"
-          /></label>
+          <label class="admin-field">
+            <span>傳動系統</span>
+            <select v-model="draft.transmission">
+              <option value="">未指定</option>
+              <option v-for="t in TRANSMISSION_OPTIONS" :key="t" :value="t">{{ t }}</option>
+            </select>
+          </label>
         </div>
         <div class="admin-form-row" style="margin-top: 10px">
           <label class="admin-check"><input v-model="draft.hasChain" type="checkbox" /> 鏈條傳動</label>
```

</details>

#### 結果
已提交 commit 3ddba69

#### 時數
0.1

---

### 車輛選單資訊新增失敗時不再靜默無反應，並讓圖片上傳更耐錯 `5d81b00`

- 使用者：Archi
- 時間：2026-09-09 17:39
- 分類：後台
- 類型：修復

#### Prompt
（使用者傳送畫面截圖回報問題，未附加文字說明）

#### 摘要
handleSubmit 先前沒有 catch，任何一步失敗（例如圖片壓縮在某些檔案上失敗）都
會變成 unhandled rejection，畫面上完全看不出發生了什麼事，只感覺「按了沒反應」。
現在會在表單內顯示錯誤訊息；圖片壓縮失敗時改為直接上傳原始檔案，不讓壓縮這個
非必要的最佳化步驟擋掉整筆資料的新增/修改。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index af240ea..171a226 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -18,6 +18,7 @@ const formOpen = ref(false)
 const submitting = ref(false)
 const editingId = ref<string | null>(null)
 const searchText = ref('')
+const submitError = ref('')
 
 const filteredModels = computed(() => {
   const q = searchText.value.trim().toLowerCase()
@@ -153,6 +154,7 @@ async function reload(): Promise<void> {
 function openCreateForm(): void {
   editingId.value = null
   resetDraft()
+  submitError.value = ''
   formOpen.value = true
 }
 
@@ -186,6 +188,7 @@ function openEditForm(model: AdminVehicleModel): void {
   draft.synonymsText = model.synonyms.join('、')
   photoFile.value = null
   existingCoverImageUrl.value = model.coverImageUrl
+  submitError.value = ''
   formOpen.value = true
 }
 
@@ -195,9 +198,24 @@ function closeForm(): void {
   resetDraft()
 }
 
+async function uploadModelPhoto(id: string, file: File): Promise<string> {
+  // Compression is a nice-to-have (resizes+re-encodes); a decode/encode edge
+  // case on some admin-supplied file (e.g. dragged in from a webpage rather
+  // than a straightforward local photo) shouldn't block the whole submit —
+  // fall back to uploading the original file untouched.
+  try {
+    const { blob } = await imageCompressionService.compressImage(file)
+    return await storageService.uploadVehicleModelPhoto(id, blob)
+  } catch (error) {
+    console.error('[ModelsSection] photo compression failed, uploading original file', error)
+    return await storageService.uploadVehicleModelPhoto(id, file)
+  }
+}
+
 async function handleSubmit(): Promise<void> {
   if (!draft.brand.trim() || !draft.series.trim()) return
   submitting.value = true
+  submitError.value = ''
   try {
     const input = {
       brand: draft.brand.trim(),
@@ -226,12 +244,14 @@ async function handleSubmit(): Promise<void> {
     const id = editingId.value ?? (await createVehicleModel(input))
     if (editingId.value) await updateVehicleModel(editingId.value, input)
     if (photoFile.value) {
-      const { blob } = await imageCompressionService.compressImage(photoFile.value)
-      const url = await storageService.uploadVehicleModelPhoto(id, blob)
+      const url = await uploadModelPhoto(id, photoFile.value)
       await setVehicleModelCoverImage(id, url)
     }
     closeForm()
     await reload()
+  } catch (error) {
+    console.error('[ModelsSection] handleSubmit failed', error)
+    submitError.value = error instanceof Error ? error.message : '儲存失敗，請稍後再試。'
   } finally {
     submitting.value = false
   }
@@ -399,6 +419,8 @@ onMounted(async () => {
           <label class="admin-check"><input v-model="draft.cbs" type="checkbox" /> CBS</label>
         </div>
 
+        <p v-if="submitError" class="admin-form-error">{{ submitError }}</p>
+
         <button
           class="admin-btn primary"
           style="margin-top: 12px"
@@ -493,4 +515,11 @@ onMounted(async () => {
   display: flex;
   gap: 8px;
 }
+
+.admin-form-error {
+  margin-top: 12px;
+  font-size: 13px;
+  font-weight: 600;
+  color: #e0413a;
+}
 </style>
```

</details>

#### 結果
已提交 commit 5d81b00

#### 時數
0.2

---

### 車輛選單資訊表單補上「名稱」欄位（原本標成「版本／配置」看不出來） `1e01212`

- 使用者：Archi
- 時間：2026-09-09 17:44
- 分類：後台
- 類型：修復

#### Prompt
啊這個選單系統都沒有車名登錄喔？

#### 摘要
原本的「版本／配置」欄位其實就是 CSV 的「名稱」欄，也是 App 選單四層
（廠牌／車系／排氣量／名稱）最後一層顯示的值（VehicleModelSelect.vue 讀
trimName 當作 name），但標籤沒講清楚，容易誤以為這個選單登錄不了車名。
改名為「名稱」、搬到車系旁邊並加上說明文字、設為必填。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index 171a226..c7fe793 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -213,7 +213,10 @@ async function uploadModelPhoto(id: string, file: File): Promise<string> {
 }
 
 async function handleSubmit(): Promise<void> {
-  if (!draft.brand.trim() || !draft.series.trim()) return
+  if (!draft.brand.trim() || !draft.series.trim() || !draft.trimName.trim()) {
+    submitError.value = '廠牌、車系、名稱為必填欄位。'
+    return
+  }
   submitting.value = true
   submitError.value = ''
   try {
@@ -315,6 +318,15 @@ onMounted(async () => {
               <option v-for="s in seriesOptions" :key="s" :value="s" />
             </datalist>
           </label>
+          <label class="admin-field">
+            <span>名稱</span>
+            <input v-model="draft.trimName" type="text" placeholder="PCX 160、勁戰六代 Cygnus-X" />
+          </label>
+        </div>
+        <p class="admin-field-hint">
+          「名稱」會顯示在 App「我的車輛」選單的最後一層（廠牌／車系／排氣量／名稱），務必填寫。
+        </p>
+        <div class="admin-form-row" style="margin-top: 10px">
           <label class="admin-field">
             <span>年式</span>
             <select v-model="draft.modelYear">
@@ -322,12 +334,6 @@ onMounted(async () => {
               <option v-for="y in yearOptions" :key="y" :value="String(y)">{{ y }}</option>
             </select>
           </label>
-        </div>
-        <div class="admin-form-row" style="margin-top: 10px">
-          <label class="admin-field"
-            ><span>版本／配置</span
-            ><input v-model="draft.trimName" type="text" placeholder="ABS 版"
-          /></label>
           <label class="admin-field">
             <span>車型類別</span>
             <input
@@ -476,6 +482,12 @@ onMounted(async () => {
   color: var(--muted);
 }
 
+.admin-field-hint {
+  margin: 4px 0 0;
+  font-size: 12px;
+  color: var(--muted);
+}
+
 .admin-check {
   display: inline-flex;
   align-items: center;
```

</details>

#### 結果
已提交 commit 1e01212

#### 時數
0.1

---

### 車輛選單資訊表單防禦性處理非字串值，避免 .trim 報錯 `27ea312`

- 使用者：Archi
- 時間：2026-09-09 17:50
- 分類：後台
- 類型：修復

#### Prompt
e.trim is not a function

#### 摘要
新增/儲存車款時回報 "e.trim is not a function"（生產環境已 minify，無法從
錯誤訊息本身定位確切欄位）。程式碼審查與後端直接測試都沒能重現，這裡先讓
所有會呼叫 .trim() 的地方都用 String(value ?? '') 包一層再處理，徹底排除
這一類錯誤，不論實際成因是哪個欄位。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/admin/sections/ModelsSection.vue b/src/admin/sections/ModelsSection.vue
index c7fe793..a933c69 100644
--- a/src/admin/sections/ModelsSection.vue
+++ b/src/admin/sections/ModelsSection.vue
@@ -112,7 +112,7 @@ watch(
 const SYNONYM_SEPARATOR = /[、,，]/
 
 function parseSynonyms(text: string): string[] {
-  return text
+  return String(text ?? '')
     .split(SYNONYM_SEPARATOR)
     .map((s) => s.trim())
     .filter((s) => s.length > 0)
@@ -143,8 +143,9 @@ function resetDraft(): void {
   existingCoverImageUrl.value = null
 }
 
-function numberOrNull(value: string): number | null {
-  return value.trim() === '' ? null : Number(value)
+function numberOrNull(value: string | number | null | undefined): number | null {
+  const text = String(value ?? '').trim()
+  return text === '' ? null : Number(text)
 }
 
 async function reload(): Promise<void> {
@@ -213,7 +214,10 @@ async function uploadModelPhoto(id: string, file: File): Promise<string> {
 }
 
 async function handleSubmit(): Promise<void> {
-  if (!draft.brand.trim() || !draft.series.trim() || !draft.trimName.trim()) {
+  const brand = String(draft.brand ?? '').trim()
+  const series = String(draft.series ?? '').trim()
+  const trimName = String(draft.trimName ?? '').trim()
+  if (!brand || !series || !trimName) {
     submitError.value = '廠牌、車系、名稱為必填欄位。'
     return
   }
@@ -221,14 +225,14 @@ async function handleSubmit(): Promise<void> {
   submitError.value = ''
   try {
     const input = {
-      brand: draft.brand.trim(),
-      series: draft.series.trim(),
+      brand,
+      series,
       modelYear: numberOrNull(draft.modelYear),
-      trimName: draft.trimName.trim() || null,
-      bodyType: draft.bodyType.trim() || null,
+      trimName: trimName || null,
+      bodyType: String(draft.bodyType ?? '').trim() || null,
       powerType: draft.powerType,
       displacementCc: numberOrNull(draft.displacementCc),
-      transmission: draft.transmission.trim() || null,
+      transmission: String(draft.transmission ?? '').trim() || null,
       hasChain: draft.hasChain,
       synonyms: parseSynonyms(draft.synonymsText),
       specs: {
```

</details>

#### 結果
已提交 commit 27ea312

#### 時數
0.1

---

### 開發日誌 Artifact 初版：Git 歷史採集腳本與時間軸儀表板

- 使用者：Archi
- 時間：2026-09-09 17:57 ～ 2026-09-09
- 分類：開發管理
- 類型：設計

#### Prompt
設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，

#### 摘要
從 git log 與本機 Claude Code session 逐字稿交叉比對，寫出 scripts/build-dev-log.mjs，自動為每筆 commit 配對觸發它的原始 prompt，並估算「prompt → commit」的間隔作為量化開發時間。以「開發時光機」為概念設計時間軸儀表板（Chakra Petch + Noto Sans TC + IBM Plex Mono 字體組合、分類色彩系統），發布為第一版 Claude Artifact。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
// 一開始用 bash -e 傳遞跳脫字元，雙重跳脫算錯，diff 內容裡的 </script>
// 沒被正確跳脫，會提早截斷內嵌的 JSON 資料。
// 錯誤版本（bash 二層跳脫後實際只送出單一反斜線，JS 字串再吃掉一次）：
const safe = data.replace(/<\//g, '<\\/');

// 修正：改寫成獨立的 .mjs 檔案執行，不經過 shell 字串跳脫，
// 直接在 Node 裡用 split/join 處理，所見即所得：
const safe = data.split('</').join('<\\/');
```

</details>

#### 結果
✅ scripts/build-dev-log.mjs 完成（git 歷史 + Claude session 比對）
✅ 第一版 Artifact 儀表板發布
⚠️ 發布當下才發現跳脫字元 bug，導致 JSON 資料被截斷；改用純 Node 組裝腳本後重新發布修正

#### 時數
0.4

---

### 整合工作日誌與團隊規劃表，評估架構走向 Firebase

- 使用者：Archi
- 時間：2026-09-09 18:21 ～ 2026-09-09
- 分類：開發管理
- 類型：開發

#### Prompt
把這兩個表也整合進去，其中，Jimmy就是li220fish，jeffery就是jefferylu33。另外當點選上方儀表板的累計提交、量化開發時間、ai協作覆蓋率要隨著下方前台後台等種類的點選變化，兩項分類佔比的橫向長條圖的長條以各顏色標注，新增「工時」對應pdf中的花費時間,以長條分別列出各使用者的時數，並以各使用者的時加總列出總工時，新增各使用者提交數。新增上傳.md形式的檔案讓其他使用者也能夠提交。移除上方說明文字，改為新增一個倒數計時器在上方欄位，並可以由使用者新增倒數計時的目的、日期、時間，字體可以大一點醒目一點。這個開發日誌應該要能夠透過連結邀請除了我以外的共同開發者填寫。

#### 摘要
讀取 MotoVerify-開發工作記錄.md 與團隊規劃表 PDF 原始檔（PDF 是試算表截圖，文字擷取欄位常黏在一起，如「8/305」=8/30+5小時，需手動拆解重建），轉譯為 manual-log-entries.json／team-sheet-entries.json 兩份結構化資料，與 git 紀錄合併成統一時間軸。新增倒數計時器與 .md 上傳協作提交功能，研究 Claude Artifact 的 db capability 後發現關鍵限制：宣告 db 需要先把分享設定從「公開」改成「限組織內」，與「連結邀請協作者」的需求衝突。

#### 結果
✅ 73 筆整合資料（Git 35 + 工作日誌 9 + 團隊規劃表 29）
✅ 倒數計時、.md 上傳、團隊工時面板設計完成
⚠️ 發現 db capability 與公開分享互斥 → 與使用者討論後決定改走自建 Firebase／Firestore，做成 Vue 專案裡的正式頁面 /dev-log

#### 時數
0.7

---

### 行動裝置版面回饋、使用者身份合併與儀表板壓縮

- 使用者：Archi
- 時間：2026-09-09 19:01 ～ 2026-09-09
- 分類：開發管理
- 類型：測試

#### Prompt
不登入也能看到最新版，另外LI,TZU-CHIEH是li220fish, AN4114760是Archi，然後根據上面的截圖，dashboard太大了，調整每個block的寬度，dashboard高度不能超過畫面的1/4，長條圖的bar要上色

#### 摘要
使用者回報手機瀏覽器看到舊版資料（其實是尚未重新整理，而非快取問題），並提供桌面版截圖：LI,TZU-CHIEH 與 AN4114760 其實分別是 li220fish、Archi 的另一組 git 身份，儀表板卡片太大、長條圖沒有顏色。將使用者身份合併邏輯寫進 build-dev-log.mjs，儀表板改為預設收合、卡片改成固定寬度橫向捲動，長條圖加上色點。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
// 同一個人、不同 git 身份 —— 合併成單一顯示名稱
const USER_ALIASES = {
  'LI,TZU-CHIEH': 'li220fish',
  AN4114760: 'Archi',
};
function canonicalUser(name) {
  return USER_ALIASES[name] || name;
}
```

</details>

#### 結果
✅ 使用者從 5 個合併為 3 個
✅ 儀表板預設收合，展開後改為橫向捲動的固定寬度卡片
✅ 每個長條圖項目加上色點，分類／使用者顏色一致對應

#### 時數
0.4

---

### 統計卡片合併同一行

- 使用者：Archi
- 時間：2026-09-09 19:22 ～ 2026-09-09
- 分類：開發管理
- 類型：開發

#### Prompt
這些block看起來可以放在同一行

#### 摘要
原本 KPI、分類長條圖、團隊統計三組卡片各自獨立換行，展開後仍佔三排。改用 CSS display:contents 把外層分組 div「拆除」，讓裡面的卡片直接參與外層 flex 容器排版，三組卡片合併成一條可橫向捲動的列。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
/* 分組 wrapper 不佔版面，子元素直接參與外層 flex 排版 */
.tile-group { display: contents; }
```

</details>

#### 結果
✅ 全部卡片（KPI + 分類長條圖 + 團隊統計）合併為單一橫向捲動列，高度大幅縮減

#### 時數
0.1

---

### 新增逐筆編輯功能，改抓 GitHub 全分支 commit

- 使用者：Archi
- 時間：2026-09-09 19:29 ～ 2026-09-09
- 分類：開發管理
- 類型：開發

#### Prompt
好，時間軸的旁邊要新增編輯該軸的內容，Li220fish有些工時沒有被登記到，這樣他才能補登，時間軸來源的部分要抓https://github.com/Li220Fish/motorcycle-verification-platform/branches裡面三個協作者commit的內容跟時間戳

#### 摘要
設計 devlog_overrides：每筆項目可疊加一份「修正」而不動到原始 git／工作日誌／團隊表資料，Vue 版接上真正的 Firestore、Artifact 版則用 Claude db capability 或退回 localStorage。同時在 build-dev-log.mjs 執行前加上 git fetch --all，這一跑就抓到 li220fish 在 develop 分支上、還沒 merge 進 backstage 因此完全沒被算進來的一筆 commit。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
// 每個 base entry 疊上一份使用者自己填寫的修正，undefined 代表
// 「這個欄位沒人動過，維持原樣」（跟 null 不同，null 代表刻意清空）
function applyOverride(entry, override) {
  if (!override) return entry;
  const next = { ...entry, edited: true };
  if (override.hours != null) {
    next.durationMs = override.hours * 3600000;
    if (next.source === 'team-sheet') next.laborHours = override.hours;
  }
  return next;
}

// build-dev-log.mjs 開頭新增：
try {
  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });
} catch (err) {
  console.warn('git fetch --all failed — using local history only:', err.message);
}
```

</details>

#### 結果
✅ 逐筆編輯 UI（Vue／Artifact 同步）完成
✅ git fetch --all 抓到 develop 分支上漏掉的 1 筆 commit，資料筆數由 73 增為 74

#### 時數
0.2

---

### Commit、push 並首次部署到 Firebase

- 使用者：Archi
- 時間：2026-09-09 19:41 ～ 2026-09-09
- 分類：開發管理
- 類型：維護

#### Prompt
commi到我的branch然後部署到firebase上，如果其他使用者也有用claude也能同步

#### 摘要
只 git add 這次功能相關的檔案，刻意避開使用者原本就存在、尚未提交的其他變更（.gitignore／package.json／storage.rules），避免混進無關的改動。詢問並取得同意後 commit 到 backstage、push 到 GitHub，接著部署 Firestore 規則與 Hosting build。

#### 結果
✅ commit 5facb36 推上 origin/backstage
✅ Firestore 規則與 Hosting 部署完成，/dev-log 正式上線於 motorcycle-verification.web.app
✅ 確認任何 Claude 帳號（甚至沒有帳號）都能同步讀寫，因為完全不依賴 Claude 的 db capability，走的是專案自己的 Firestore

#### 時數
0.2

---

### 新增 /dev-log 開發日誌頁面（Git、工作日誌、團隊規劃表整合） `5facb36`

- 使用者：Archi
- 時間：2026-09-09 19:42
- 分類：開發管理
- 類型：功能

#### Prompt
設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，

#### 摘要
彙整 git log（含所有分支）、工作日誌與團隊規劃表 PDF 為統一時間軸，
支援分類/使用者篩選、倒數計時、.md 上傳協作提交、逐筆編輯修正，
資料存於 Firestore（devlog_settings/devlog_submissions/devlog_overrides）
不需登入即可讀寫。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/firestore.rules b/firestore.rules
index cc29f65..0509527 100644
--- a/firestore.rules
+++ b/firestore.rules
@@ -580,6 +580,25 @@ service cloud.firestore {
     // they now fall through to the default-deny match below, same as any
     // other nonexistent collection.
 
+    // /dev-log is a link-open internal team tool with no auth screen —
+    // intentionally world-writable, scoped to these collection names only.
+    // Never reuse devlog_settings/devlog_submissions/devlog_overrides for
+    // anything that needs real access control.
+    match /devlog_settings/{document=**} {
+      allow read, write: if true;
+    }
+
+    match /devlog_submissions/{document=**} {
+      allow read, write: if true;
+    }
+
+    // Per-entry corrections layered on top of the static git/work-log/
+    // team-sheet data at render time (e.g. a teammate backfilling hours
+    // that never made it into the team sheet) — doc id is the entry id.
+    match /devlog_overrides/{document=**} {
+      allow read, write: if true;
+    }
+
     match /{document=**} {
       allow read, write: if false;
     }
diff --git a/scripts/build-dev-log.mjs b/scripts/build-dev-log.mjs
new file mode 100644
index 0000000..f970aaf
--- /dev/null
+++ b/scripts/build-dev-log.mjs
@@ -0,0 +1,395 @@
+#!/usr/bin/env node
+// Mines git history + local Claude Code session transcripts (~/.claude/projects/<this-project>/*.jsonl)
+// into a structured development log: one entry per commit, enriched with the user prompt(s)
+// that led to it, the diff (collapsible in the viewer), and a rough time-spent estimate.
+//
+// Output: scripts/data/dev-log.json  (consumed by the dev-log Artifact dashboard)
+
+import { execSync } from 'node:child_process';
+import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
+import { homedir } from 'node:os';
+import path from 'node:path';
+
+const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
+const PROJECT_SLUG = REPO_ROOT.replace(/\//g, '-'); // Claude Code's on-disk project key
+const SESSIONS_DIR = path.join(homedir(), '.claude', 'projects', PROJECT_SLUG);
+const OUT_FILE = path.join(REPO_ROOT, 'src', 'data', 'dev-log.json');
+
+const MAX_PROMPT_CHARS = 4000;
+const MAX_DIFF_CHARS = 20000;
+const SESSION_GAP_MS = 3 * 60 * 60 * 1000; // >3h idle before a commit => don't attribute that gap as "work time"
+
+// ---------- 1. git commits ----------
+
+// Pull every collaborator's branches from GitHub before reading history —
+// commits pushed to develop/feature branches but never merged into the
+// branch checked out locally would otherwise be invisible to `git log`.
+try {
+  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });
+} catch (err) {
+  console.warn('git fetch --all failed (offline?) — using local history only:', err.message);
+}
+
+// Same humans, different git identities used across machines/commits —
+// collapse to one canonical display name so per-user stats aren't split.
+const USER_ALIASES = {
+  'LI,TZU-CHIEH': 'li220fish',
+  AN4114760: 'Archi',
+};
+function canonicalUser(name) {
+  return USER_ALIASES[name] || name;
+}
+
+function gitLog() {
+  const sep = '\x1f';
+  const rowSep = '\x1e';
+  const raw = execSync(
+    `git log --all --date=iso-strict --pretty=format:"%H${sep}%ad${sep}%an${sep}%ae${sep}%s${sep}%b${rowSep}"`,
+    { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 }
+  ).toString();
+  return raw
+    .split(rowSep)
+    .map((r) => r.trim())
+    .filter(Boolean)
+    .map((row) => {
+      const [hash, date, author, email, subject, body] = row.split(sep);
+      return { hash, date, author: canonicalUser(author), email, subject, body: (body || '').trim() };
+    })
+    .reverse(); // chronological
+}
+
+function gitShowStat(hash) {
+  return execSync(`git show --stat --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 })
+    .toString()
+    .trim();
+}
+
+function gitDiff(hash) {
+  let diff = execSync(`git show --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 256 }).toString();
+  let truncated = false;
+  if (diff.length > MAX_DIFF_CHARS) {
+    diff = diff.slice(0, MAX_DIFF_CHARS);
+    truncated = true;
+  }
+  return { diff, truncated };
+}
+
+function changedFiles(hash) {
+  return execSync(`git show --name-only --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 })
+    .toString()
+    .split('\n')
+    .map((s) => s.trim())
+    .filter(Boolean);
+}
+
+// ---------- 1b. commit type + cleaned topic ----------
+
+function classifyType(subject) {
+  const m = subject.match(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:/i);
+  if (m) return m[1].toLowerCase();
+  if (/^merge/i.test(subject)) return 'merge';
+  return 'other';
+}
+
+function cleanTopic(subject) {
+  return subject.replace(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:\s*/i, '').trim() || subject;
+}
+
+function cleanBody(body) {
+  if (!body) return null;
+  const cleaned = body
+    .split('\n')
+    .filter((line) => !/^Co-Authored-By:/i.test(line.trim()) && !/^🤖 Generated with/i.test(line.trim()))
+    .join('\n')
+    .trim();
+  return cleaned || null;
+}
+
+// ---------- 2. categorization ----------
+
+function categorize(files) {
+  const hits = { 後台: 0, 檢定辨識: 0, 系統: 0, 前台: 0 };
+  for (const f of files) {
+    if (/^src\/admin\//.test(f)) hits['後台']++;
+    else if (
+      /src\/(services\/(verification|recognition|analysis|motion|bluetooth)|components\/(verification|probe))\//.test(f) ||
+      /src\/views\/.*[Vv]erif/.test(f)
+    )
+      hits['檢定辨識']++;
+    else if (
+      /^(functions|scripts|ios|android|storage\.rules|firestore\.rules|firebase\.json|vite\.config|package\.json|\.github)/.test(f) ||
+      /src\/(services\/firebase|config)\//.test(f)
+    )
+      hits['系統']++;
+    else if (/^src\//.test(f)) hits['前台']++;
+  }
+  const best = Object.entries(hits).sort((a, b) => b[1] - a[1])[0];
+  return best && best[1] > 0 ? best[0] : '系統';
+}
+
+// ---------- 3. Claude Code session transcripts ----------
+
+function extractText(content) {
+  if (typeof content === 'string') return content;
+  if (!Array.isArray(content)) return '';
+  return content
+    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
+    .map((c) => c.text)
+    .join('\n')
+    .trim();
+}
+
+function hasNonTextBlocks(content) {
+  return Array.isArray(content) && content.some((c) => c && (c.type === 'image' || c.type === 'tool_result'));
+}
+
+function loadSessionMessages() {
+  let files = [];
+  try {
+    files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.jsonl'));
+  } catch {
+    return { userTurns: [], edits: [] };
+  }
+
+  const userTurns = []; // { ts, text, sessionId }
+  const imageOnlyTurns = []; // { ts, sessionId } - screenshot/image feedback with no text
+  const edits = []; // { ts, tool, file, sessionId }
+
+  for (const file of files) {
+    const full = path.join(SESSIONS_DIR, file);
+    let lines;
+    try {
+      lines = readFileSync(full, 'utf8').split('\n');
+    } catch {
+      continue;
+    }
+    for (const line of lines) {
+      if (!line.trim()) continue;
+      let obj;
+      try {
+        obj = JSON.parse(line);
+      } catch {
+        continue;
+      }
+      const ts = obj.timestamp;
+      if (obj.type === 'user' && obj.message && obj.message.role === 'user' && ts) {
+        const content = obj.message.content;
+        const rawText = extractText(content);
+        const isImageCaptionOnly = /^\[Image: .*\]$/s.test(rawText.trim());
+        if (hasNonTextBlocks(content) || isImageCaptionOnly) {
+          // no usable text, but still a real user turn (e.g. pasted screenshot) - keep for duration fallback
+          if (!extractText(content).replace(/^\[Image: .*\]$/s, '').trim()) {
+            imageOnlyTurns.push({ ts: Date.parse(ts), sessionId: obj.sessionId || file });
+          }
+          continue;
+        }
+        const text = rawText;
+        if (text && !text.startsWith('<system-reminder') && !/^<command-name>/.test(text)) {
+          userTurns.push({ ts: Date.parse(ts), text, sessionId: obj.sessionId || file });
+        }
+      }
+      if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content) && ts) {
+        for (const block of obj.message.content) {
+          if (block.type === 'tool_use' && ['Edit', 'Write', 'MultiEdit'].includes(block.name)) {
+            const fp = block.input && (block.input.file_path || block.input.path);
+            if (fp) edits.push({ ts: Date.parse(ts), tool: block.name, file: fp, sessionId: obj.sessionId || file });
+          }
+        }
+      }
+    }
+  }
+  userTurns.sort((a, b) => a.ts - b.ts);
+  imageOnlyTurns.sort((a, b) => a.ts - b.ts);
+  edits.sort((a, b) => a.ts - b.ts);
+  return { userTurns, imageOnlyTurns, edits };
+}
+
+// ---------- 4. stitch commits + prompts ----------
+
+function buildEntries(commits, userTurns, imageOnlyTurns) {
+  const entries = [];
+  let prevCommitTs = null;
+
+  for (const c of commits) {
+    const commitTs = Date.parse(c.date);
+    const windowStart = prevCommitTs !== null ? prevCommitTs : commitTs - SESSION_GAP_MS;
+
+    const promptsInWindow = userTurns.filter((u) => u.ts > windowStart && u.ts <= commitTs && u.text.length > 3);
+
+    let promptText = null;
+    let promptTs = null;
+    let extraPromptCount = 0;
+    if (promptsInWindow.length) {
+      // pick the first substantial (non-trivial ack) prompt in the window as "the" request
+      const substantial = promptsInWindow.find((p) => p.text.length > 15) || promptsInWindow[0];
+      promptText = substantial.text.slice(0, MAX_PROMPT_CHARS);
+      promptTs = substantial.ts;
+      extraPromptCount = promptsInWindow.length - 1;
+    } else {
+      const imagesInWindow = imageOnlyTurns.filter((u) => u.ts > windowStart && u.ts <= commitTs);
+      if (imagesInWindow.length) {
+        promptText = '（使用者傳送畫面截圖回報問題，未附加文字說明）';
+        promptTs = imagesInWindow[0].ts;
+      }
+    }
+
+    let durationMs = null;
+    if (promptTs !== null) {
+      durationMs = Math.max(0, commitTs - promptTs);
+      if (durationMs > SESSION_GAP_MS) durationMs = null; // idle gap, not real work time
+    }
+
+    const files = changedFiles(c.hash);
+    const category = categorize(files);
+    const stat = gitShowStat(c.hash);
+    const { diff, truncated } = gitDiff(c.hash);
+
+    entries.push({
+      id: c.hash,
+      source: 'git',
+      hash: c.hash,
+      shortHash: c.hash.slice(0, 7),
+      user: c.author,
+      email: c.email,
+      timestamp: c.date,
+      endTimestamp: null,
+      timePrecision: 'minute',
+      type: classifyType(c.subject),
+      topic: cleanTopic(c.subject),
+      category,
+      summary: cleanBody(c.body),
+      prompt: promptText,
+      promptExtraCount: extraPromptCount,
+      files,
+      stat,
+      diff,
+      diffTruncated: truncated,
+      result: `已提交 commit ${c.hash.slice(0, 7)}`,
+      durationMs,
+      laborHours: null,
+      priority: null,
+      status: null,
+    });
+
+    prevCommitTs = commitTs;
+  }
+  return entries;
+}
+
+// ---------- 5. manual work-log entries (hand-transcribed from MotoVerify-開發工作記錄.md) ----------
+
+function loadManualLogEntries() {
+  const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'manual-log-entries.json'), 'utf8'));
+  return raw.map((e) => ({
+    id: e.id,
+    source: 'manual-log',
+    hash: null,
+    shortHash: null,
+    user: e.user,
+    email: null,
+    timestamp: e.timestamp,
+    endTimestamp: e.endTimestamp,
+    timePrecision: e.timePrecision,
+    type: e.type,
+    topic: e.topic,
+    category: e.category,
+    summary: e.summary,
+    prompt: e.prompt,
+    promptExtraCount: 0,
+    files: [],
+    stat: e.stat,
+    diff: e.diff,
+    diffTruncated: false,
+    result: e.result,
+    durationMs: e.durationHours != null ? e.durationHours * 3600000 : null,
+    laborHours: null,
+    priority: null,
+    status: null,
+    estimateHoursText: e.estimateHoursText || null,
+  }));
+}
+
+// ---------- 6. team planning sheet entries (transcribed from 團隊規劃表 - 需求表.pdf) ----------
+
+function loadTeamSheetData() {
+  const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'team-sheet-entries.json'), 'utf8'));
+  const toIso = (d) => (d ? `${d}T12:00:00+08:00` : null);
+  const entries = raw.entries.map((e) => ({
+    id: e.id,
+    source: 'team-sheet',
+    hash: null,
+    shortHash: null,
+    user: e.user,
+    email: null,
+    timestamp: toIso(e.start),
+    endTimestamp: toIso(e.end),
+    timePrecision: 'day',
+    type: e.type,
+    topic: e.topic,
+    category: e.category,
+    summary: e.summary,
+    prompt: null,
+    promptExtraCount: 0,
+    files: [],
+    stat: null,
+    diff: null,
+    diffTruncated: false,
+    result: `${raw.statusResult[e.status] || e.status}${e.end ? `（結案：${e.end}）` : ''}`,
+    durationMs: e.hours != null ? e.hours * 3600000 : null,
+    laborHours: e.hours,
+    priority: e.priority,
+    status: e.status,
+  }));
+  return { entries, teamSummary: raw.teamSummary };
+}
+
+// ---------- main ----------
+
+const commits = gitLog();
+const { userTurns, imageOnlyTurns } = loadSessionMessages();
+const gitEntries = buildEntries(commits, userTurns, imageOnlyTurns);
+const manualLogEntries = loadManualLogEntries();
+const { entries: teamSheetEntries, teamSummary } = loadTeamSheetData();
+
+const entries = [...gitEntries, ...manualLogEntries, ...teamSheetEntries];
+
+const withDuration = entries.filter((e) => e.durationMs !== null);
+const totalDurationMs = withDuration.reduce((sum, e) => sum + e.durationMs, 0);
+const withPrompt = entries.filter((e) => e.prompt);
+
+const byUserLaborHours = teamSheetEntries.reduce((acc, e) => {
+  if (e.laborHours != null) acc[e.user] = (acc[e.user] || 0) + e.laborHours;
+  return acc;
+}, {});
+
+const summary = {
+  generatedAt: new Date().toISOString(),
+  totalEntries: entries.length,
+  entriesWithTimedPrompt: withPrompt.length,
+  totalTimedDurationMs: totalDurationMs,
+  bySource: entries.reduce((acc, e) => {
+    acc[e.source] = (acc[e.source] || 0) + 1;
+    return acc;
+  }, {}),
+  byCategory: entries.reduce((acc, e) => {
+    acc[e.category] = (acc[e.category] || 0) + 1;
+    return acc;
+  }, {}),
+  byUser: entries.reduce((acc, e) => {
+    acc[e.user] = (acc[e.user] || 0) + 1;
+    return acc;
+  }, {}),
+  timedDurationByCategory: withDuration.reduce((acc, e) => {
+    acc[e.category] = (acc[e.category] || 0) + e.durationMs;
+    return acc;
+  }, {}),
+  byUserLaborHours,
+};
+
+writeFileSync(OUT_FILE, JSON.stringify({ summary, teamSummary, entries }, null, 2));
+console.log(`Wrote ${entries.length} entries to ${path.relative(REPO_ROOT, OUT_FILE)}`);
+console.log(
+  `  git: ${gitEntries.length}, manual-log: ${manualLogEntries.length}, team-sheet: ${teamSheetEntries.length}`
+);
+console.log(`Entries with a captured prompt: ${withPrompt.length}`);
+console.log(`Blended quantified time across all sources: ${(totalDurationMs / 3600000).toFixed(1)}h`);
diff --git a/scripts/data/manual-log-entries.json b/scripts/data/manual-log-entries.json
new file mode 100644
index 0000000..5a3fb46
--- /dev/null
+++ b/scripts/data/manual-log-entries.json
@@ -0,0 +1,164 @@
+[
+  {
+    "id": "manual-work1-v01",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-08-23T00:00:00+08:00",
+    "endTimestamp": null,
+    "timePrecision": "day",
+    "type": "design",
+    "topic": "業務提案 v0.1：資訊架構定義",
+    "category": "系統",
+    "summary": "從初版 UI 畫面討論演變為完整商業提案的第一步：定義首頁六大區塊排序、五分頁底部導覽、訊息與討論中心的計數邏輯。",
+    "prompt": "我們正在設計一個手機的機車檢驗程市及中古交易平台，這邊是我同學畫的架構圖，先幫我設計出這個程式在各個頁面上的示意畫面…在主畫面我這邊的想法是，讓使用者能在畫面中第一眼發現到的是自己感興趣的車輛…",
+    "diff": null,
+    "stat": null,
+    "result": "✅ 資訊架構定義完成\n交付物：視覺原型（Artifact: home_block_order_and_tab_bar）\n- 首頁六大區塊排序（我的車 → 待辦提醒 → 快速記錄 → 我的刊登 → 感興趣的車輛 → 新知）\n- 五分頁底部導覽重排（首頁 | 市場 | 檢驗 | 訊息 | 討論中心）\n關鍵決策：我的帳號頁挪至首頁右上角頭像入口／待辦提醒固定第二區塊／快速記錄需 15 秒內完成／訊息與討論中心各自計數邏輯",
+    "estimateHoursText": "1-2 小時",
+    "durationHours": 1.5
+  },
+  {
+    "id": "manual-work1-v02",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-08-24T00:00:00+08:00",
+    "endTimestamp": "2026-08-29T00:00:00+08:00",
+    "timePrecision": "day",
+    "type": "design",
+    "topic": "業務提案 v0.2：商業模式全面成形",
+    "category": "系統",
+    "summary": "使用者要求從初版 UI 設計轉向完整商業計畫，清點開放問題並提出初版假設。產出十大功能商業模式畫布、市場規模評估、收入模型初版與海外擴張評估。",
+    "prompt": "你重新寫一個商業提案計劃跟目前有疑慮的問題全部列清單出來",
+    "diff": null,
+    "stat": null,
+    "result": "⚠️ 識別出四個硬問題（檢驗員來源／裁判兼球員、檢驗費定價、灰標可信度、冷啟動範圍）\n交付物：MotoVerify-Proposal-v0.2.docx\n關鍵發現：確認紅海判定（交易流量、車況記錄均無護城河）／識別真空地帶（機車第三方檢驗市場基本沒有）／經濟性風險（3萬元車收2,500檢驗費=8%成本）／信任機制漏洞（灰標自填紀錄無法驗證）",
+    "estimateHoursText": "3-5 小時",
+    "durationHours": 4
+  },
+  {
+    "id": "manual-work1-v03",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-08-30T00:00:00+08:00",
+    "endTimestamp": "2026-09-02T00:00:00+08:00",
+    "timePrecision": "day",
+    "type": "design",
+    "topic": "業務提案 v0.3：資料過渡機制與法律定位收斂",
+    "category": "系統",
+    "summary": "透過深度討論，確認 QR code 現場掃碼方案完全解決「成交驗證」與「遠端詐騙」風險，進而重新設計整個提案架構。核心轉折：資料過渡機制改為 QR 現場掃碼、檢驗評分改為只顯示分項信號不顯示總分。",
+    "prompt": "轉向內部迭代，聚焦於「資料過渡機制」與「法律定位」的設計決策",
+    "diff": null,
+    "stat": null,
+    "result": "✅ 商業模式徹底收斂（B2B repair shop SaaS 為主力收入 60-70%）\n✅ 法律定位清晰（檢驗分項信號，非總分裁決）\n✅ 成交驗證機制設計完成（QR 現場掃碼 + 雙邊確認價格）\n✅ 成交價資料庫成為獨佔優勢（台灣機車版實價登錄）\n⚠️ MotoProbe 硬體完全缺席提案（技術上已實裝，但成本與供應鏈策略待決）\n⚠️ Year 2 淨利邊際脆弱（NT$150K，評審必攻）\n交付物：MotoVerify-Proposal-v0.3.docx + 海外市場分析",
+    "estimateHoursText": "8-10 小時",
+    "durationHours": 9
+  },
+  {
+    "id": "manual-work2-phase1",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-08-28T00:00:00+08:00",
+    "endTimestamp": null,
+    "timePrecision": "day",
+    "type": "dev",
+    "topic": "訊息功能：本機設置與本地開發",
+    "category": "系統",
+    "summary": "從現有 motoverify-prototype.html 提取訊息功能，建立獨立專案；協助使用者排除本機開發環境問題（工作目錄錯誤、.env 檔案隱藏、TextEdit 自動加副檔名）。",
+    "prompt": "要怎麼在自己的電腦上跑啊",
+    "diff": "1. 安裝 Node.js LTS 版\n2. 解壓縮 motoverify-messages.zip\n3. 開啟終端機（Mac: Command+Space → Terminal）\n4. 驗證 Node 安裝：node -v\n5. 進入專案目錄：cd <path-to-motoverify-messages>\n6. 安裝套件：npm install\n7. 啟動開發伺服器：npm run dev",
+    "stat": "七步驟設置指南",
+    "result": "✅ 使用者成功在本地執行專案",
+    "estimateHoursText": "2-3 小時",
+    "durationHours": 2.5
+  },
+  {
+    "id": "manual-work2-phase2",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-08-29T00:00:00+08:00",
+    "endTimestamp": null,
+    "timePrecision": "day",
+    "type": "dev",
+    "topic": "訊息功能：環境變數與 Vercel 部署",
+    "category": "系統",
+    "summary": "建立四表 Supabase 架構（profiles / conversations / participants / messages）與 SECURITY DEFINER RLS 策略，實作無環境變數時的 Demo in-memory 自動降級後端，並排除 Vercel 環境變數類型、GitHub Token scope、macOS keychain 快取等部署卡點。",
+    "prompt": "設定 Supabase 連線並部署到 Vercel",
+    "diff": "-- 四表結構\ntables/\n  profiles (uid, handle, avatar, createdAt)\n  conversations (id, createdAt, subject)\n  conversation_participants (conversationId, uid, joinedAt)\n  messages (id, conversationId, senderUid, text, createdAt)\n\nviews/\n  conversation_overview (conversationId, unreadCount, lastMessage)\n\n-- RLS（SECURITY DEFINER 避免遞迴）\nCREATE OR REPLACE FUNCTION get_conversation_access(\n  conv_id UUID,\n  user_id UUID\n) RETURNS BOOLEAN AS $$\nBEGIN\n  RETURN EXISTS (\n    SELECT 1 FROM conversation_participants\n    WHERE \"conversationId\" = conv_id AND \"uid\" = user_id\n  );\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\nalter table messages enable row level security;\ncreate policy \"user_can_read_own_messages\" on messages\n  for select\n  using (get_conversation_access(conversation_id, auth.uid()));\n\n// Demo 後端自動降級（無環境變數時）\n// src/services/backend.ts\nif (!import.meta.env.VITE_SUPABASE_URL) {\n  console.log('[DEMO MODE] Using in-memory back
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 5facb36

#### 時數
1.7

---

### 開發日誌上傳區改為複製整理 prompt，取代靜態提示文字 `bef5a28`

- 使用者：Archi
- 時間：2026-09-09 19:54
- 分類：開發管理
- 類型：修復

#### Prompt
在下載範本.md按鈕旁，取消「任何知道此網址的人都可以在此上傳工作記錄，會即時同步給所有協作者」，新增一個按鈕是「複製日誌md prompt」，按下後一鍵複製以下字串「那你把我在此專案中迄今新開發的內容的以.md方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間。」

#### 摘要
移除「任何知道此網址的人都可以上傳」提示，改成一鍵複製「幫我整理
開發日誌」的 prompt，讓協作者能直接貼給自己的 Claude 產生範本內容
再上傳。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/src/views/DevLogView.vue b/src/views/DevLogView.vue
index ab2418a..ea24897 100644
--- a/src/views/DevLogView.vue
+++ b/src/views/DevLogView.vue
@@ -643,6 +643,24 @@ function downloadTemplate() {
   URL.revokeObjectURL(url)
 }
 
+const DEVLOG_PROMPT =
+  '那你把我在此專案中迄今新開發的內容的以.md方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間。'
+const copyPromptStatus = ref('')
+let copyPromptStatusTimer: ReturnType<typeof setTimeout> | null = null
+
+async function copyDevLogPrompt() {
+  try {
+    await navigator.clipboard.writeText(DEVLOG_PROMPT)
+    copyPromptStatus.value = '已複製，貼給你自己的 Claude 就能產生範本內容'
+  } catch {
+    copyPromptStatus.value = '複製失敗，請手動選取文字複製'
+  }
+  if (copyPromptStatusTimer) clearTimeout(copyPromptStatusTimer)
+  copyPromptStatusTimer = setTimeout(() => {
+    copyPromptStatus.value = ''
+  }, 4000)
+}
+
 // ---------- sticky day-heading offset tracks the (dynamically sized) header ----------
 const headerEl = ref<HTMLElement | null>(null)
 let headerResizeObserver: ResizeObserver | null = null
@@ -679,6 +697,7 @@ onUnmounted(() => {
   unsubscribeCountdown?.()
   unsubscribeOverrides?.()
   if (countdownTicker) clearInterval(countdownTicker)
+  if (copyPromptStatusTimer) clearTimeout(copyPromptStatusTimer)
   headerResizeObserver?.disconnect()
 })
 </script>
@@ -918,6 +937,9 @@ onUnmounted(() => {
           {{ showTemplate ? '關閉範本' : '查看範本' }}
         </button>
         <button class="template-btn" type="button" @click="downloadTemplate">下載範本 .md</button>
+        <button class="template-btn" type="button" @click="copyDevLogPrompt">
+          複製日誌md prompt
+        </button>
         <input
           ref="fileInput"
           type="file"
@@ -925,9 +947,7 @@ onUnmounted(() => {
           hidden
           @change="onFileChosen"
         />
-        <span class="upload-note"
-          >任何知道此網址的人都可以在此上傳工作記錄，會即時同步給所有協作者</span
-        >
+        <span v-if="copyPromptStatus" class="upload-note">{{ copyPromptStatus }}</span>
       </div>
 
       <div v-if="showTemplate" class="upload-panel">
```

</details>

#### 結果
已提交 commit bef5a28

#### 時數
0.1

---

### 把開發日誌本身的開發過程同步進時間軸

- 使用者：Archi
- 時間：2026-09-09 19:56
- 分類：開發管理
- 類型：維護

#### Prompt
把開發這套日誌的專案內容同步到時間軸上

#### 摘要
這套時間軸工具原本只記錄「ride騎吧」App 本身的開發，沒有記錄自己被開發出來的過程。從這一輪對話的 session 逐字稿裡撈出真實的訊息時間戳，比對出四個 Artifact 階段性迭代（初版、整合工作日誌／團隊表、行動裝置回饋與壓縮、卡片合併同一行）並沒有對應的 git commit（Artifact 檔案本身不在版控裡），因此以 manual-log 補上；另外也在 build-dev-log.mjs 加上清除 <ide_selection>／<system-reminder> 標籤的邏輯，避免這類工具注入的雜訊混進擷取到的 prompt 內容。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
// 這類標籤是編輯器/系統注入的上下文，不是使用者實際打的字，
// 跟 system-reminder 一樣要在擷取 prompt 前先剝掉：
const text = rawText
  .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/g, '')
  .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
  .trim();
```

</details>

#### 結果
✅ 新增 5 筆 manual-log 項目，補上這套工具自己開發過程中、沒有對應 git commit 的階段
✅ 修正 prompt 擷取邏輯，5facb36 那筆 commit 顯示的原始 prompt 不再夾帶 IDE 選取內容雜訊

#### 時數
0.2

---

### 開發日誌補上工具自身的開發歷程，並清理 prompt 擷取雜訊 `0759349`

- 使用者：Archi
- 時間：2026-09-09 20:03
- 分類：開發管理
- 類型：功能

#### Prompt
把開發這套日誌的專案內容同步到時間軸上

#### 摘要
Artifact 迭代階段沒有對應的 git commit（檔案不在版控裡），改以
manual-log 補上七個階段的真實 prompt 與時間戳（取自本次 session
逐字稿）。同時修正 prompt 擷取邏輯，避免 <ide_selection> 與
<system-reminder> 等工具注入內容混入結果。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/scripts/build-dev-log.mjs b/scripts/build-dev-log.mjs
index f970aaf..38482b9 100644
--- a/scripts/build-dev-log.mjs
+++ b/scripts/build-dev-log.mjs
@@ -183,7 +183,12 @@ function loadSessionMessages() {
           }
           continue;
         }
-        const text = rawText;
+        // Strip IDE-injected context blocks (selection snippets, system reminders) —
+        // they're harness noise around the message, not part of what the user typed.
+        const text = rawText
+          .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/g, '')
+          .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
+          .trim();
         if (text && !text.startsWith('<system-reminder') && !/^<command-name>/.test(text)) {
           userTurns.push({ ts: Date.parse(ts), text, sessionId: obj.sessionId || file });
         }
diff --git a/scripts/data/manual-log-entries.json b/scripts/data/manual-log-entries.json
index 5a3fb46..d0f262c 100644
--- a/scripts/data/manual-log-entries.json
+++ b/scripts/data/manual-log-entries.json
@@ -160,5 +160,131 @@
     "result": "✅ R 在產品端資料工作已確認有效應用\n✅ 優先順序清晰（市場規模 → 財務敏感度 → 統計模型）\n⏳ 實踐待定（需交通部資料、提案假設文檔、Year 2+ 資料累積）",
     "estimateHoursText": "1-2 小時",
     "durationHours": 1.5
+  },
+  {
+    "id": "manual-devlog-phase1",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T17:57:44+08:00",
+    "endTimestamp": "2026-09-09T18:21:56+08:00",
+    "timePrecision": "minute",
+    "type": "design",
+    "topic": "開發日誌 Artifact 初版：Git 歷史採集腳本與時間軸儀表板",
+    "category": "系統",
+    "summary": "從 git log 與本機 Claude Code session 逐字稿交叉比對，寫出 scripts/build-dev-log.mjs，自動為每筆 commit 配對觸發它的原始 prompt，並估算「prompt → commit」的間隔作為量化開發時間。以「開發時光機」為概念設計時間軸儀表板（Chakra Petch + Noto Sans TC + IBM Plex Mono 字體組合、分類色彩系統），發布為第一版 Claude Artifact。",
+    "prompt": "設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，",
+    "diff": "// 一開始用 bash -e 傳遞跳脫字元，雙重跳脫算錯，diff 內容裡的 </script>\n// 沒被正確跳脫，會提早截斷內嵌的 JSON 資料。\n// 錯誤版本（bash 二層跳脫後實際只送出單一反斜線，JS 字串再吃掉一次）：\nconst safe = data.replace(/<\\//g, '<\\\\/');\n\n// 修正：改寫成獨立的 .mjs 檔案執行，不經過 shell 字串跳脫，\n// 直接在 Node 裡用 split/join 處理，所見即所得：\nconst safe = data.split('</').join('<\\\\/');",
+    "stat": "修正 </script> 跳脫 bug 的關鍵片段",
+    "result": "✅ scripts/build-dev-log.mjs 完成（git 歷史 + Claude session 比對）\n✅ 第一版 Artifact 儀表板發布\n⚠️ 發布當下才發現跳脫字元 bug，導致 JSON 資料被截斷；改用純 Node 組裝腳本後重新發布修正",
+    "estimateHoursText": "約 0.4 小時（17:57–18:21）",
+    "durationHours": 0.4
+  },
+  {
+    "id": "manual-devlog-phase2",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T18:21:56+08:00",
+    "endTimestamp": "2026-09-09T19:01:25+08:00",
+    "timePrecision": "minute",
+    "type": "dev",
+    "topic": "整合工作日誌與團隊規劃表，評估架構走向 Firebase",
+    "category": "系統",
+    "summary": "讀取 MotoVerify-開發工作記錄.md 與團隊規劃表 PDF 原始檔（PDF 是試算表截圖，文字擷取欄位常黏在一起，如「8/305」=8/30+5小時，需手動拆解重建），轉譯為 manual-log-entries.json／team-sheet-entries.json 兩份結構化資料，與 git 紀錄合併成統一時間軸。新增倒數計時器與 .md 上傳協作提交功能，研究 Claude Artifact 的 db capability 後發現關鍵限制：宣告 db 需要先把分享設定從「公開」改成「限組織內」，與「連結邀請協作者」的需求衝突。",
+    "prompt": "把這兩個表也整合進去，其中，Jimmy就是li220fish，jeffery就是jefferylu33。另外當點選上方儀表板的累計提交、量化開發時間、ai協作覆蓋率要隨著下方前台後台等種類的點選變化，兩項分類佔比的橫向長條圖的長條以各顏色標注，新增「工時」對應pdf中的花費時間,以長條分別列出各使用者的時數，並以各使用者的時加總列出總工時，新增各使用者提交數。新增上傳.md形式的檔案讓其他使用者也能夠提交。移除上方說明文字，改為新增一個倒數計時器在上方欄位，並可以由使用者新增倒數計時的目的、日期、時間，字體可以大一點醒目一點。這個開發日誌應該要能夠透過連結邀請除了我以外的共同開發者填寫。",
+    "diff": null,
+    "stat": null,
+    "result": "✅ 73 筆整合資料（Git 35 + 工作日誌 9 + 團隊規劃表 29）\n✅ 倒數計時、.md 上傳、團隊工時面板設計完成\n⚠️ 發現 db capability 與公開分享互斥 → 與使用者討論後決定改走自建 Firebase／Firestore，做成 Vue 專案裡的正式頁面 /dev-log",
+    "estimateHoursText": "約 0.7 小時（18:21–19:01）",
+    "durationHours": 0.66
+  },
+  {
+    "id": "manual-devlog-phase3",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T19:01:25+08:00",
+    "endTimestamp": "2026-09-09T19:22:13+08:00",
+    "timePrecision": "minute",
+    "type": "test",
+    "topic": "行動裝置版面回饋、使用者身份合併與儀表板壓縮",
+    "category": "系統",
+    "summary": "使用者回報手機瀏覽器看到舊版資料（其實是尚未重新整理，而非快取問題），並提供桌面版截圖：LI,TZU-CHIEH 與 AN4114760 其實分別是 li220fish、Archi 的另一組 git 身份，儀表板卡片太大、長條圖沒有顏色。將使用者身份合併邏輯寫進 build-dev-log.mjs，儀表板改為預設收合、卡片改成固定寬度橫向捲動，長條圖加上色點。",
+    "prompt": "不登入也能看到最新版，另外LI,TZU-CHIEH是li220fish, AN4114760是Archi，然後根據上面的截圖，dashboard太大了，調整每個block的寬度，dashboard高度不能超過畫面的1/4，長條圖的bar要上色",
+    "diff": "// 同一個人、不同 git 身份 —— 合併成單一顯示名稱\nconst USER_ALIASES = {\n  'LI,TZU-CHIEH': 'li220fish',\n  AN4114760: 'Archi',\n};\nfunction canonicalUser(name) {\n  return USER_ALIASES[name] || name;\n}",
+    "stat": "使用者別名合併邏輯",
+    "result": "✅ 使用者從 5 個合併為 3 個\n✅ 儀表板預設收合，展開後改為橫向捲動的固定寬度卡片\n✅ 每個長條圖項目加上色點，分類／使用者顏色一致對應",
+    "estimateHoursText": "約 0.35 小時（19:01–19:22）",
+    "durationHours": 0.35
+  },
+  {
+    "id": "manual-devlog-phase4",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T19:22:13+08:00",
+    "endTimestamp": "2026-09-09T19:29:03+08:00",
+    "timePrecision": "minute",
+    "type": "dev",
+    "topic": "統計卡片合併同一行",
+    "category": "系統",
+    "summary": "原本 KPI、分類長條圖、團隊統計三組卡片各自獨立換行，展開後仍佔三排。改用 CSS display:contents 把外層分組 div「拆除」，讓裡面的卡片直接參與外層 flex 容器排版，三組卡片合併成一條可橫向捲動的列。",
+    "prompt": "這些block看起來可以放在同一行",
+    "diff": "/* 分組 wrapper 不佔版面，子元素直接參與外層 flex 排版 */\n.tile-group { display: contents; }",
+    "stat": "display:contents 合併卡片列",
+    "result": "✅ 全部卡片（KPI + 分類長條圖 + 團隊統計）合併為單一橫向捲動列，高度大幅縮減",
+    "estimateHoursText": "約 0.1 小時（19:22–19:29）",
+    "durationHours": 0.11
+  },
+  {
+    "id": "manual-devlog-phase5",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T19:29:03+08:00",
+    "endTimestamp": "2026-09-09T19:41:49+08:00",
+    "timePrecision": "minute",
+    "type": "dev",
+    "topic": "新增逐筆編輯功能，改抓 GitHub 全分支 commit",
+    "category": "系統",
+    "summary": "設計 devlog_overrides：每筆項目可疊加一份「修正」而不動到原始 git／工作日誌／團隊表資料，Vue 版接上真正的 Firestore、Artifact 版則用 Claude db capability 或退回 localStorage。同時在 build-dev-log.mjs 執行前加上 git fetch --all，這一跑就抓到 li220fish 在 develop 分支上、還沒 merge 進 backstage 因此完全沒被算進來的一筆 commit。",
+    "prompt": "好，時間軸的旁邊要新增編輯該軸的內容，Li220fish有些工時沒有被登記到，這樣他才能補登，時間軸來源的部分要抓https://github.com/Li220Fish/motorcycle-verification-platform/branches裡面三個協作者commit的內容跟時間戳",
+    "diff": "// 每個 base entry 疊上一份使用者自己填寫的修正，undefined 代表\n// 「這個欄位沒人動過，維持原樣」（跟 null 不同，null 代表刻意清空）\nfunction applyOverride(entry, override) {\n  if (!override) return entry;\n  const next = { ...entry, edited: true };\n  if (override.hours != null) {\n    next.durationMs = override.hours * 3600000;\n    if (next.source === 'team-sheet') next.laborHours = override.hours;\n  }\n  return next;\n}\n\n// build-dev-log.mjs 開頭新增：\ntry {\n  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });\n} catch (err) {\n  console.warn('git fetch --all failed — using local history only:', err.message);\n}",
+    "stat": "devlog_overrides 疊加邏輯 + git fetch --all",
+    "result": "✅ 逐筆編輯 UI（Vue／Artifact 同步）完成\n✅ git fetch --all 抓到 develop 分支上漏掉的 1 筆 commit，資料筆數由 73 增為 74",
+    "estimateHoursText": "約 0.2 小時（19:29–19:41）",
+    "durationHours": 0.21
+  },
+  {
+    "id": "manual-devlog-phase6",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T19:41:49+08:00",
+    "endTimestamp": "2026-09-09T19:51:14+08:00",
+    "timePrecision": "minute",
+    "type": "maint",
+    "topic": "Commit、push 並首次部署到 Firebase",
+    "category": "系統",
+    "summary": "只 git add 這次功能相關的檔案，刻意避開使用者原本就存在、尚未提交的其他變更（.gitignore／package.json／storage.rules），避免混進無關的改動。詢問並取得同意後 commit 到 backstage、push 到 GitHub，接著部署 Firestore 規則與 Hosting build。",
+    "prompt": "commi到我的branch然後部署到firebase上，如果其他使用者也有用claude也能同步",
+    "diff": null,
+    "stat": null,
+    "result": "✅ commit 5facb36 推上 origin/backstage\n✅ Firestore 規則與 Hosting 部署完成，/dev-log 正式上線於 motorcycle-verification.web.app\n✅ 確認任何 Claude 帳號（甚至沒有帳號）都能同步讀寫，因為完全不依賴 Claude 的 db capability，走的是專案自己的 Firestore",
+    "estimateHoursText": "約 0.15 小時（19:41–19:51）",
+    "durationHours": 0.16
+  },
+  {
+    "id": "manual-devlog-phase8",
+    "source": "manual-log",
+    "user": "Archi",
+    "timestamp": "2026-09-09T19:56:15+08:00",
+    "endTimestamp": null,
+    "timePrecision": "minute",
+    "type": "maint",
+    "topic": "把開發日誌本身的開發過程同步進時間軸",
+    "category": "系統",
+    "summary": "這套時間軸工具原本只記錄「ride騎吧」App 本身的開發，沒有記錄自己被開發出來的過程。從這一輪對話的 session 逐字稿裡撈出真實的訊息時間戳，比對出四個 Artifact 階段性迭代（初版、整合工作日誌／團隊表、行動裝置回饋與壓縮、卡片合併同一行）並沒有對應的 git commit（Artifact 檔案本身不在版控裡），因此以 manual-log 補上；另外也在 build-dev-log.mjs 加上清除 <ide_selection>／<system-reminder> 標籤的邏輯，避免這類工具注入的雜訊混進擷取到的 prompt 內容。",
+    "prompt": "把開發這套日誌的專案內容同步到時間軸上",
+    "diff": "// 這類標籤是編輯器/系統注入的上下文，不是使用者實際打的字，\n// 跟 system-reminder 一樣要在擷取 prompt 前先剝掉：\nconst text = rawText\n  .replace(/<ide_selection>[\\s\\S]*?<\\/ide_selection>/g, '')\n  .replace(/<system-reminder>[\\s\\S]*?<\\/system-reminder>/g, '')\n  .trim();",
+    "stat": "清除 IDE 注入標籤的 prompt 清理邏輯",
+    "result": "✅ 新增 5 筆 manual-log 項目，補上這套工具自己開發過程中、沒有對應 git commit 的階段\n✅ 修正 prompt 擷取邏輯，5facb36 那筆 commit 顯示的原始 prompt 不再夾帶 IDE 選取內容雜訊",
+    "estimateHoursText": "約 0.15 小時",
+    "durationHours": 0.15
   }
 ]
diff --git a/src/data/dev-log.json b/src/data/dev-log.json
index 2168667..4804bf7 100644
--- a/src/data/dev-log.json
+++ b/src/data/dev-log.json
@@ -1,28 +1,28 @@
 {
   "summary": {
-    "generatedAt": "2026-09-09T11:30:38.348Z",
-    "totalEntries": 74,
-    "entriesWithTimedPrompt": 33,
-    "totalTimedDurationMs": 601843199,
+    "generatedAt": "2026-09-09T12:01:38.726Z",
+    "totalEntries": 83,
+    "entriesWithTimedPrompt": 42,
+    "totalTimedDurationMs": 619727612,
     "bySource": {
-      "git": 36,
-      "manual-log": 9,
+      "git": 38,
+      "manual-log": 16,
       "team-sheet": 29
     },
     "byCategory": {
-      "系統": 36,
+      "系統": 44,
       "檢定辨識": 9,
-      "前台": 21,
+      "前台": 22,
       "後台": 8
     },
     "byUser": {
       "li220fish": 20,
       "jefferylu33": 6,
-      "Archi": 48
+      "Archi": 57
     },
     "timedDurationByCategory": {
-      "系統": 412560716,
-      "前台": 106905747,
+      "系統": 430251908,
+      "前台": 107098968,
       "檢定辨識": 50437316,
       "後台": 31939420
     },
@@ -1560,7 +1560,7 @@
       "topic": "車輛型號選單改為廠牌/車系/排氣量/名稱四層篩選，並匯入台灣機車型號 CSV",
       "category": "系統",
       "summary": "排氣量以固定級距分桶（50cc以下～1000以上），型號資料含鏈條傳動欄位；\n基礎13項健檢在車輛標記有鏈條傳動時，動態多顯示「鏈條」一項。",
-      "prompt": "<ide_selection>The user selected the lines 15 to 15 from /Users/archi/Downloads/motoverify-inspect-checklist_5.html:\n#E8EEFB; color:#3360E4;\n\nThis may or may not be related to the current task.</ide_selection>\n更新app",
+      "prompt": "這是清單表，把他放進「我的車輛」、「選單選則」內，原本的項目有廠牌、車型，現在改為「廠牌」、「車系」、「排氣量」、「名稱」，其中「排氣量」的選單內容有：50cc以下、51~125、126~250、251~549、549~1000、1000以上，csv中有「鏈條」的選項，如果鏈條的值是true, 應該要在基礎13項檢測中多增加一項：鏈條",
       "promptExtraCount": 3,
       "files": [
         "package.json",
@@ -1578,7 +1578,7 @@
       "diff": "diff --git a/package.json b/package.json\nindex 27b603d..355a84b 100644\n--- a/package.json\n+++ b/package.json\n@@ -14,6 +14,7 @@\n     \"seed:demo-data\": \"node scripts/seed-demo-data.mjs\",\n     \"seed:mock-vehicles\": \"node scripts/seed-mock-vehicles.mjs\",\n     \"seed:marketplace-mock\": \"node scripts/seed-marketplace-mock.mjs\",\n+    \"import:vehicle-models\": \"node scripts/import-vehicle-models-csv.mjs\",\n     \"cleanup:database\": \"node scripts/cleanup-database.mjs\",\n     \"cap:sync\": \"npm run build && npx cap sync\",\n     \"cap:android\": \"npx cap open android\",\ndiff --git a/scripts/import-vehicle-models-csv.mjs b/scripts/import-vehicle-models-csv.mjs\nnew file mode 100644\nindex 0000000..3cd3603\n--- /dev/null\n+++ b/scripts/import-vehicle-models-csv.mjs\n@@ -0,0 +1,229 @@\n+/**\n+ * One-time (re-runnable) import of a curated 台灣機車重機型號表 CSV into the\n+ * `vehicleModels` reference collection — backs VehicleModelSelect.vue's\n+ * 廠牌/車系/排氣量/名稱 cascading picker and BasicHealthCheck13.vue's\n+ * conditional 鏈條 item (see Vehicle.hasChain in src/types/vehicle.ts).\n+ *\n+ * CSV columns (UTF-8, no quoted fields): 廠牌,車系,名稱,排氣量,油耗,馬力,\n+ * 形式,鏈條傳動,圖片路徑,同義詞 — mapped to brand/series/trimName/\n+ * displacementCc/-/-/bodyType/hasChain/-/-. 油耗、馬力、圖片路徑、同義詞 are\n+ * intentionally NOT imported: fuel/power are rough estimates not worth\n+ * treating as spec data, and cover images are a separate in-progress effort\n+ * (scripts/fetch-model-image-candidates.mjs / apply-model-image.mjs).\n+ *\n+ * 排氣量 sometimes lists more than one CC value for one row (e.g.\n+ * \"124.5/155.8 CC\" for a model sold in two displacements) — each distinct\n+ * value becomes its own vehicleModels doc sharing the same brand/series/\n+ * trimName/bodyType/hasChain, so 排氣量 bucketing in the picker works\n+ * correctly for each variant.\n+ *\n+ * Idempotent: every doc this script writes is tagged importSource=\n+ * CSV_IMPORT_SOURCE; on each run, existing docs with that same tag are\n+ * deleted before re-inserting, so re-running replaces this script's own\n+ * output in place instead of accumulating duplicates. Docs from any other\n+ * source (admin-added via ModelsSection.vue, or another import) are\n+ * untouched since they won't carry this tag.\n+ *\n+ * Usage:\n+ *   ALLOW_TEST_SEED=true node scripts/import-vehicle-models-csv.mjs [csvPath]\n+ * Defaults to ~/Downloads/台灣機車重機型號表_1990至今.csv if no path given.\n+ */\n+import { readFileSync, existsSync } from 'node:fs'\n+import { fileURLToPath } from 'node:url'\n+import os from 'node:os'\n+import path from 'node:path'\n+\n+import { initializeApp } from 'firebase/app'\n+import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'\n+import {\n+  addDoc,\n+  collection,\n+  deleteDoc,\n+  getDocs,\n+  getFirestore,\n+  query,\n+  serverTimestamp,\n+  where,\n+} from 'firebase/firestore'\n+\n+const __dirname = path.dirname(fileURLToPath(import.meta.url))\n+const rootDir = path.resolve(__dirname, '..')\n+\n+const CSV_IMPORT_SOURCE = 'csv-1990-present'\n+const DEFAULT_CSV_PATH = path.join(os.homedir(), 'Downloads', '台灣機車重機型號表_1990至今.csv')\n+\n+const EMPTY_SPECS = {\n+  engine: {\n+    coolingType: null,\n+    cylinderCount: null,\n+    valveTrain: null,\n+    valvesPerCylinder: null,\n+    compressionRatio: null,\n+    maxPowerHp: null,\n+    maxPowerRpm: null,\n+    maxTorqueKgm: null,\n+    maxTorqueRpm: null,\n+    fuelSystem: null,\n+    startSystem: null,\n+    fuelTankCapacityL: null,\n+  },\n+  electric: { motorPowerW: null, motorPowerRpm: null, batteryCount: null },\n+  dimensions: {\n+    lengthMm: null,\n+    widthMm: null,\n+    heightMm: null,\n+    seatHeightMm: null,\n+    wheelbaseMm: null,\n+    weightKg: null,\n+  },\n+  safety: { abs: false, tcs: false, cbs: false },\n+  efficiency: { officialAverageKmPerL: null, fuelType: null, emissionStandard: null },\n+}\n+\n+const EMPTY_FEATURES = {\n+  convenience: { keyless: false, usbCharging: false, idleStop: false, reverseAssist: false },\n+  display: { displayType: null, smartphoneConnect: false, navigationSupport: false },\n+  lighting: {\n+    ledHeadlight: false,\n+    ledTaillight: false,\n+    ledTurnSignals: false,\n+    hazardLights: false,\n+  },\n+  storage: { underSeatStorageL: null, frontStorage: false },\n+  security: { immobilizer: false, antiTheftAlarm: false },\n+}\n+\n+function loadEnvFile(filePath) {\n+  if (!existsSync(filePath)) return {}\n+  const result = {}\n+  for (const line of readFileSync(filePath, 'utf-8').split('\\n')) {\n+    const trimmed = line.trim()\n+    if (!trimmed || trimmed.startsWith('#')) continue\n+    const eq = trimmed.indexOf('=')\n+    if (eq === -1) continue\n+    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()\n+  }\n+  return result\n+}\n+\n+function guardEnvironment() {\n+  if (process.env.NODE_ENV === 'production') {\n+    console.error('[import-vehicle-models-csv] Refusing to run: NODE_ENV=production.')\n+    process.exit(1)\n+  }\n+  if (process.env.ALLOW_TEST_SEED !== 'true') {\n+    console.error(\n+      '[import-vehicle-models-csv] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',\n+    )\n+    process.exit(1)\n+  }\n+}\n+\n+/** \"124.5/155.8 CC\" -> [124.5, 155.8]; \"97 CC\" -> [97]. */\n+function parseDisplacements(raw) {\n+  return raw\n+    .replace(/CC/i, '')\n+    .split('/')\n+    .map((part) => Number.parseFloat(part.trim()))\n+    .filter((value) => Number.isFinite(value))\n+}\n+\n+function parseCsv(text) {\n+  const lines = text.replace(/^﻿/, '').split(/\\r?\\n/).filter((line) => line.trim() !== '')\n+  const [, ...rows] = lines // drop header row — column order is documented above, not re-derived\n+  return rows.map((line) => {\n+    const [brand, series, trimName, displacement, , , bodyType, hasChainRaw] = line.split(',')\n+    return {\n+      brand: brand?.trim() ?? '',\n+      series: series?.trim() ?? '',\n+      trimName: trimName?.trim() ?? '',\n+      displacements: parseDisplacements(displacement ?? ''),\n+      bodyType: bodyType?.trim() || null,\n+      hasChain: hasChainRaw?.trim().toLowerCase() === 'true',\n+    }\n+  })\n+}\n+\n+async function main() {\n+  guardEnvironment()\n+\n+  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH\n+  if (!existsSync(csvPath)) {\n+    console.error(`[import-vehicle-models-csv] CSV not found: ${csvPath}`)\n+    process.exit(1)\n+  }\n+\n+  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))\n+  const envDefault = loadEnvFile(path.join(rootDir, '.env'))\n+  const env = { ...envDefault, ...envLocal, ...process.env }\n+  const firebaseConfig = {\n+    apiKey: env.VITE_FIREBASE_API_KEY,\n+    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,\n+    projectId: env.VITE_FIREBASE_PROJECT_ID,\n+    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,\n+    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,\n+    appId: env.VITE_FIREBASE_APP_ID,\n+  }\n+  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {\n+    console.error('[import-vehicle-models-csv] Missing Firebase config — check .env / .env.local.')\n+    process.exit(1)\n+  }\n+\n+  const app = initializeApp(firebaseConfig)\n+  const auth = getAuth(app)\n+  const db = getFirestore(app)\n+  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')\n+\n+  console.log(`[import-vehicle-models-csv] Project: ${firebaseConfig.projectId}`)\n+  console.log(`[import-vehicle-models-csv] CSV: ${csvPath}`)\n+\n+  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))\n+  console.log(`[import-vehicle-models-csv] Parsed ${rows.length} CSV rows.`)\n+\n+  const modelsCollection = collection(db, 'vehicleModels')\n+\n+  const staleSnapshot = await getDocs(\n+    query(modelsCollection, where('importSource', '==', CSV_IMPORT_SOURCE)),\n+  )\n+  if (staleSnapshot.size > 0) {\n+    console.log(`[import-vehicle-models-csv] Removing ${staleSnapshot.size} docs from a prior run...`)\n+    await Promise.all(staleSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)))\n+  }\n+\n+  let written = 0\n+  for (const row of rows) {\n+    if (!row.brand || !row.trimName) continue\n+    const displacements = row.displacements.length > 0 ? row.displacements : [null]\n+    for (const displacementCc of displacements) {\n+      await addDoc(modelsCollection, {\n+        brand: row.brand,\n+        series: row.series,\n+        modelYear: null,\n+        trimName: row.trimName,\n+        bodyType: row.bodyType,\n+        powerType: 'gasoline',\n+        displacementCc,\n+        transmission: null,\n+        hasChain: row.hasChain,\n+        coverImageUrl: null,\n+        photos: [],\n+        specs: EMPTY_SPECS,\n+        features: EMPTY_FEATURES,\n+        realFuelStats: { averageKmPerL: null, vehicleCount: 0 },\n+        reviewStats: { averageRating: null, reviewCount: 0 },\n+        importSource: CSV_IMPORT_SOURCE,\n+        createdAt: serverTimestamp(),\n+      })\n+      written += 1\n+    }\n+  }\n+\n+  console.log(`[import-vehicle-
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 0759349

#### 時數
0.1

---

### 開發日誌新增「開發管理」分類，區分工具自身開發與 ride騎吧 系統工作 `66a57e0`

- 使用者：Archi
- 時間：2026-09-09 20:15
- 分類：開發管理
- 類型：功能

#### Prompt
1.關於日誌的開發內容在時間軸上把label改為「開發管理」
2.可不可以綁定各個協作者的claude code帳號讓大家ai協作的東西可以直接同步在時間軸上

#### 摘要
原本把「開發日誌工具自己的開發紀錄」跟「ride騎吧 App 本身的系統工作」
都標成「系統」，混在一起不好分辨。新增第五個分類「開發管理」，
build-dev-log.mjs 自動依檔案路徑（含 devlog/dev-log 字樣）分類，
manual-log 裡記錄本工具開發歷程的項目也一併改標。

#### 產出程式碼
<details>
<summary>展開查看（點擊收合／展開）</summary>

```diff
diff --git a/scripts/build-dev-log.mjs b/scripts/build-dev-log.mjs
index 38482b9..ee87dd1 100644
--- a/scripts/build-dev-log.mjs
+++ b/scripts/build-dev-log.mjs
@@ -108,9 +108,12 @@ function cleanBody(body) {
 // ---------- 2. categorization ----------
 
 function categorize(files) {
-  const hits = { 後台: 0, 檢定辨識: 0, 系統: 0, 前台: 0 };
+  const hits = { 後台: 0, 檢定辨識: 0, 系統: 0, 前台: 0, 開發管理: 0 };
   for (const f of files) {
-    if (/^src\/admin\//.test(f)) hits['後台']++;
+    // this dev-log dashboard's own source/data — distinct from the ride騎吧
+    // app's own 系統 work, so it doesn't drown out real infra commits there.
+    if (/dev-?log/i.test(f)) hits['開發管理']++;
+    else if (/^src\/admin\//.test(f)) hits['後台']++;
     else if (
       /src\/(services\/(verification|recognition|analysis|motion|bluetooth)|components\/(verification|probe))\//.test(f) ||
       /src\/views\/.*[Vv]erif/.test(f)
diff --git a/scripts/data/manual-log-entries.json b/scripts/data/manual-log-entries.json
index d0f262c..93177e1 100644
--- a/scripts/data/manual-log-entries.json
+++ b/scripts/data/manual-log-entries.json
@@ -170,7 +170,7 @@
     "timePrecision": "minute",
     "type": "design",
     "topic": "開發日誌 Artifact 初版：Git 歷史採集腳本與時間軸儀表板",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "從 git log 與本機 Claude Code session 逐字稿交叉比對，寫出 scripts/build-dev-log.mjs，自動為每筆 commit 配對觸發它的原始 prompt，並估算「prompt → commit」的間隔作為量化開發時間。以「開發時光機」為概念設計時間軸儀表板（Chakra Petch + Noto Sans TC + IBM Plex Mono 字體組合、分類色彩系統），發布為第一版 Claude Artifact。",
     "prompt": "設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，",
     "diff": "// 一開始用 bash -e 傳遞跳脫字元，雙重跳脫算錯，diff 內容裡的 </script>\n// 沒被正確跳脫，會提早截斷內嵌的 JSON 資料。\n// 錯誤版本（bash 二層跳脫後實際只送出單一反斜線，JS 字串再吃掉一次）：\nconst safe = data.replace(/<\\//g, '<\\\\/');\n\n// 修正：改寫成獨立的 .mjs 檔案執行，不經過 shell 字串跳脫，\n// 直接在 Node 裡用 split/join 處理，所見即所得：\nconst safe = data.split('</').join('<\\\\/');",
@@ -188,7 +188,7 @@
     "timePrecision": "minute",
     "type": "dev",
     "topic": "整合工作日誌與團隊規劃表，評估架構走向 Firebase",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "讀取 MotoVerify-開發工作記錄.md 與團隊規劃表 PDF 原始檔（PDF 是試算表截圖，文字擷取欄位常黏在一起，如「8/305」=8/30+5小時，需手動拆解重建），轉譯為 manual-log-entries.json／team-sheet-entries.json 兩份結構化資料，與 git 紀錄合併成統一時間軸。新增倒數計時器與 .md 上傳協作提交功能，研究 Claude Artifact 的 db capability 後發現關鍵限制：宣告 db 需要先把分享設定從「公開」改成「限組織內」，與「連結邀請協作者」的需求衝突。",
     "prompt": "把這兩個表也整合進去，其中，Jimmy就是li220fish，jeffery就是jefferylu33。另外當點選上方儀表板的累計提交、量化開發時間、ai協作覆蓋率要隨著下方前台後台等種類的點選變化，兩項分類佔比的橫向長條圖的長條以各顏色標注，新增「工時」對應pdf中的花費時間,以長條分別列出各使用者的時數，並以各使用者的時加總列出總工時，新增各使用者提交數。新增上傳.md形式的檔案讓其他使用者也能夠提交。移除上方說明文字，改為新增一個倒數計時器在上方欄位，並可以由使用者新增倒數計時的目的、日期、時間，字體可以大一點醒目一點。這個開發日誌應該要能夠透過連結邀請除了我以外的共同開發者填寫。",
     "diff": null,
@@ -206,7 +206,7 @@
     "timePrecision": "minute",
     "type": "test",
     "topic": "行動裝置版面回饋、使用者身份合併與儀表板壓縮",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "使用者回報手機瀏覽器看到舊版資料（其實是尚未重新整理，而非快取問題），並提供桌面版截圖：LI,TZU-CHIEH 與 AN4114760 其實分別是 li220fish、Archi 的另一組 git 身份，儀表板卡片太大、長條圖沒有顏色。將使用者身份合併邏輯寫進 build-dev-log.mjs，儀表板改為預設收合、卡片改成固定寬度橫向捲動，長條圖加上色點。",
     "prompt": "不登入也能看到最新版，另外LI,TZU-CHIEH是li220fish, AN4114760是Archi，然後根據上面的截圖，dashboard太大了，調整每個block的寬度，dashboard高度不能超過畫面的1/4，長條圖的bar要上色",
     "diff": "// 同一個人、不同 git 身份 —— 合併成單一顯示名稱\nconst USER_ALIASES = {\n  'LI,TZU-CHIEH': 'li220fish',\n  AN4114760: 'Archi',\n};\nfunction canonicalUser(name) {\n  return USER_ALIASES[name] || name;\n}",
@@ -224,7 +224,7 @@
     "timePrecision": "minute",
     "type": "dev",
     "topic": "統計卡片合併同一行",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "原本 KPI、分類長條圖、團隊統計三組卡片各自獨立換行，展開後仍佔三排。改用 CSS display:contents 把外層分組 div「拆除」，讓裡面的卡片直接參與外層 flex 容器排版，三組卡片合併成一條可橫向捲動的列。",
     "prompt": "這些block看起來可以放在同一行",
     "diff": "/* 分組 wrapper 不佔版面，子元素直接參與外層 flex 排版 */\n.tile-group { display: contents; }",
@@ -242,7 +242,7 @@
     "timePrecision": "minute",
     "type": "dev",
     "topic": "新增逐筆編輯功能，改抓 GitHub 全分支 commit",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "設計 devlog_overrides：每筆項目可疊加一份「修正」而不動到原始 git／工作日誌／團隊表資料，Vue 版接上真正的 Firestore、Artifact 版則用 Claude db capability 或退回 localStorage。同時在 build-dev-log.mjs 執行前加上 git fetch --all，這一跑就抓到 li220fish 在 develop 分支上、還沒 merge 進 backstage 因此完全沒被算進來的一筆 commit。",
     "prompt": "好，時間軸的旁邊要新增編輯該軸的內容，Li220fish有些工時沒有被登記到，這樣他才能補登，時間軸來源的部分要抓https://github.com/Li220Fish/motorcycle-verification-platform/branches裡面三個協作者commit的內容跟時間戳",
     "diff": "// 每個 base entry 疊上一份使用者自己填寫的修正，undefined 代表\n// 「這個欄位沒人動過，維持原樣」（跟 null 不同，null 代表刻意清空）\nfunction applyOverride(entry, override) {\n  if (!override) return entry;\n  const next = { ...entry, edited: true };\n  if (override.hours != null) {\n    next.durationMs = override.hours * 3600000;\n    if (next.source === 'team-sheet') next.laborHours = override.hours;\n  }\n  return next;\n}\n\n// build-dev-log.mjs 開頭新增：\ntry {\n  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });\n} catch (err) {\n  console.warn('git fetch --all failed — using local history only:', err.message);\n}",
@@ -260,7 +260,7 @@
     "timePrecision": "minute",
     "type": "maint",
     "topic": "Commit、push 並首次部署到 Firebase",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "只 git add 這次功能相關的檔案，刻意避開使用者原本就存在、尚未提交的其他變更（.gitignore／package.json／storage.rules），避免混進無關的改動。詢問並取得同意後 commit 到 backstage、push 到 GitHub，接著部署 Firestore 規則與 Hosting build。",
     "prompt": "commi到我的branch然後部署到firebase上，如果其他使用者也有用claude也能同步",
     "diff": null,
@@ -278,7 +278,7 @@
     "timePrecision": "minute",
     "type": "maint",
     "topic": "把開發日誌本身的開發過程同步進時間軸",
-    "category": "系統",
+    "category": "開發管理",
     "summary": "這套時間軸工具原本只記錄「ride騎吧」App 本身的開發，沒有記錄自己被開發出來的過程。從這一輪對話的 session 逐字稿裡撈出真實的訊息時間戳，比對出四個 Artifact 階段性迭代（初版、整合工作日誌／團隊表、行動裝置回饋與壓縮、卡片合併同一行）並沒有對應的 git commit（Artifact 檔案本身不在版控裡），因此以 manual-log 補上；另外也在 build-dev-log.mjs 加上清除 <ide_selection>／<system-reminder> 標籤的邏輯，避免這類工具注入的雜訊混進擷取到的 prompt 內容。",
     "prompt": "把開發這套日誌的專案內容同步到時間軸上",
     "diff": "// 這類標籤是編輯器/系統注入的上下文，不是使用者實際打的字，\n// 跟 system-reminder 一樣要在擷取 prompt 前先剝掉：\nconst text = rawText\n  .replace(/<ide_selection>[\\s\\S]*?<\\/ide_selection>/g, '')\n  .replace(/<system-reminder>[\\s\\S]*?<\\/system-reminder>/g, '')\n  .trim();",
diff --git a/src/data/dev-log.json b/src/data/dev-log.json
index 4804bf7..ff282ca 100644
--- a/src/data/dev-log.json
+++ b/src/data/dev-log.json
@@ -1,30 +1,32 @@
 {
   "summary": {
-    "generatedAt": "2026-09-09T12:01:38.726Z",
-    "totalEntries": 83,
-    "entriesWithTimedPrompt": 42,
-    "totalTimedDurationMs": 619727612,
+    "generatedAt": "2026-09-09T12:11:30.748Z",
+    "totalEntries": 84,
+    "entriesWithTimedPrompt": 43,
+    "totalTimedDurationMs": 620136441,
     "bySource": {
-      "git": 38,
+      "git": 39,
       "manual-log": 16,
       "team-sheet": 29
     },
     "byCategory": {
-      "系統": 44,
+      "系統": 36,
       "檢定辨識": 9,
-      "前台": 22,
-      "後台": 8
+      "前台": 21,
+      "後台": 8,
+      "開發管理": 10
     },
     "byUser": {
       "li220fish": 20,
       "jefferylu33": 6,
-      "Archi": 57
+      "Archi": 58
     },
     "timedDurationByCategory": {
-      "系統": 430251908,
-      "前台": 107098968,
+      "系統": 416625970,
+      "前台": 106905747,
       "檢定辨識": 50437316,
-      "後台": 31939420
+      "後台": 31939420,
+      "開發管理": 14227988
     },
     "byUserLaborHours": {
       "li220fish": 71,
@@ -1883,7 +1885,7 @@
       "timePrecision": "minute",
       "type": "feat",
       "topic": "新增 /dev-log 開發日誌頁面（Git、工作日誌、團隊規劃表整合）",
-      "category": "系統",
+      "category": "開發管理",
       "summary": "彙整 git log（含所有分支）、工作日誌與團隊規劃表 PDF 為統一時間軸，\n支援分類/使用者篩選、倒數計時、.md 上傳協作提交、逐筆編輯修正，\n資料存於 Firestore（devlog_settings/devlog_submissions/devlog_overrides）\n不需登入即可讀寫。",
       "prompt": "設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，",
       "promptExtraCount": 6,
@@ -1919,7 +1921,7 @@
       "timePrecision": "minute",
       "type": "fix",
       "topic": "開發日誌上傳區改為複製整理 prompt，取代靜態提示文字",
-      "category": "前台",
+      "category": "開發管理",
       "summary": "移除「任何知道此網址的人都可以上傳」提示，改成一鍵複製「幫我整理\n開發日誌」的 prompt，讓協作者能直接貼給自己的 Claude 產生範本內容\n再上傳。",
       "prompt": "在下載範本.md按鈕旁，取消「任何知道此網址的人都可以在此上傳工作記錄，會即時同步給所有協作者」，新增一個按鈕是「複製日誌md prompt」，按下後一鍵複製以下字串「那你把我在此專案中迄今新開發的內容的以.md方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間。」",
       "promptExtraCount": 0,
@@ -1935,6 +1937,36 @@
       "priority": null,
       "status": null
     },
+    {
+      "id": "075934951ae0657237bc14b1ac1e08d715da1a48",
+      "source": "git",
+      "hash": "075934951ae0657237bc14b1ac1e08d715da1a48",
+      "shortHash": "0759349",
+      "user": "Archi",
+      "email": "an4114760@gs.ncku.edu.tw",
+      "timestamp": "2026-09-09T20:03:04+08:00",
+      "endTimestamp": null,
+      "timePrecision": "minute",
+      "type": "feat",
+      "topic": "開發日誌補上工具自身的開發歷程，並清理 prompt 擷取雜訊",
+      "category": "開發管理",
+      "summary": "Artifact 迭代階段沒有對應的 git commit（檔案不在版控裡），改以\nmanual-log 補上七個階段的真實 prompt 與時間戳（取自本次 session\n逐字稿）。同時修正 prompt 擷取邏輯，避免 <ide_selection> 與\n<system-reminder> 等工具注入內容混入結果。",
+      "prompt": "把開發這套日誌的專案內容同步到時間軸上",
+      "promptExtraCount": 0,
+      "files": [
+        "scripts/build-dev-log.mjs",
+        "scripts/data/manual-log-entries.json",
+        "src/data/dev-log.json"
+      ],
+      "stat": "scripts/build-dev-log.mjs            |   7 +-\n scripts/data/manual-log-entries.json | 126 ++++++++++++++++\n src/data/dev-log.json                | 279 +++++++++++++++++++++++++++++++++--\n 3 files changed, 398 insertions(+), 14 deletions(-)",
+      "diff": "diff --git a/scripts/build-dev-log.mjs b/scripts/build-dev-log.mjs\nindex f970aaf..38482b9 100644\n--- a/scripts/build-dev-log.mjs\n+++ b/scripts/build-dev-log.mjs\n@@ -183,7 +183,12 @@ function loadSessionMessages() {\n           }\n           continue;\n         }\n-        const text = rawText;\n+        // Strip IDE-injected context blocks (selection snippets, system reminders) —\n+        // they're harness noise around the message, not part of what the user typed.\n+        const text = rawText\n+          .replace(/<ide_selection>[\\s\\S]*?<\\/ide_selection>/g, '')\n+          .replace(/<system-reminder>[\\s\\S]*?<\\/system-reminder>/g, '')\n+          .trim();\n         if (text && !text.startsWith('<system-reminder') && !/^<command-name>/.test(text)) {\n           userTurns.push({ ts: Date.parse(ts), text, sessionId: obj.sessionId || file });\n         }\ndiff --git a/scripts/data/manual-log-entries.json b/scripts/data/manual-log-entries.json\nindex 5a3fb46..d0f262c 100644\n--- a/scripts/data/manual-log-entries.json\n+++ b/scripts/data/manual-log-entries.json\n@@ -160,5 +160,131 @@\n     \"result\": \"✅ R 在產品端資料工作已確認有效應用\\n✅ 優先順序清晰（市場規模 → 財務敏感度 → 統計模型）\\n⏳ 實踐待定（需交通部資料、提案假設文檔、Year 2+ 資料累積）\",\n     \"estimateHoursText\": \"1-2 小時\",\n     \"durationHours\": 1.5\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase1\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T17:57:44+08:00\",\n+    \"endTimestamp\": \"2026-09-09T18:21:56+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"design\",\n+    \"topic\": \"開發日誌 Artifact 初版：Git 歷史採集腳本與時間軸儀表板\",\n+    \"category\": \"系統\",\n+    \"summary\": \"從 git log 與本機 Claude Code session 逐字稿交叉比對，寫出 scripts/build-dev-log.mjs，自動為每筆 commit 配對觸發它的原始 prompt，並估算「prompt → commit」的間隔作為量化開發時間。以「開發時光機」為概念設計時間軸儀表板（Chakra Petch + Noto Sans TC + IBM Plex Mono 字體組合、分類色彩系統），發布為第一版 Claude Artifact。\",\n+    \"prompt\": \"設計一個程式，把在「ride騎吧」中迄今新開發的內容的方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間，\",\n+    \"diff\": \"// 一開始用 bash -e 傳遞跳脫字元，雙重跳脫算錯，diff 內容裡的 </script>\\n// 沒被正確跳脫，會提早截斷內嵌的 JSON 資料。\\n// 錯誤版本（bash 二層跳脫後實際只送出單一反斜線，JS 字串再吃掉一次）：\\nconst safe = data.replace(/<\\\\//g, '<\\\\\\\\/');\\n\\n// 修正：改寫成獨立的 .mjs 檔案執行，不經過 shell 字串跳脫，\\n// 直接在 Node 裡用 split/join 處理，所見即所得：\\nconst safe = data.split('</').join('<\\\\\\\\/');\",\n+    \"stat\": \"修正 </script> 跳脫 bug 的關鍵片段\",\n+    \"result\": \"✅ scripts/build-dev-log.mjs 完成（git 歷史 + Claude session 比對）\\n✅ 第一版 Artifact 儀表板發布\\n⚠️ 發布當下才發現跳脫字元 bug，導致 JSON 資料被截斷；改用純 Node 組裝腳本後重新發布修正\",\n+    \"estimateHoursText\": \"約 0.4 小時（17:57–18:21）\",\n+    \"durationHours\": 0.4\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase2\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T18:21:56+08:00\",\n+    \"endTimestamp\": \"2026-09-09T19:01:25+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"dev\",\n+    \"topic\": \"整合工作日誌與團隊規劃表，評估架構走向 Firebase\",\n+    \"category\": \"系統\",\n+    \"summary\": \"讀取 MotoVerify-開發工作記錄.md 與團隊規劃表 PDF 原始檔（PDF 是試算表截圖，文字擷取欄位常黏在一起，如「8/305」=8/30+5小時，需手動拆解重建），轉譯為 manual-log-entries.json／team-sheet-entries.json 兩份結構化資料，與 git 紀錄合併成統一時間軸。新增倒數計時器與 .md 上傳協作提交功能，研究 Claude Artifact 的 db capability 後發現關鍵限制：宣告 db 需要先把分享設定從「公開」改成「限組織內」，與「連結邀請協作者」的需求衝突。\",\n+    \"prompt\": \"把這兩個表也整合進去，其中，Jimmy就是li220fish，jeffery就是jefferylu33。另外當點選上方儀表板的累計提交、量化開發時間、ai協作覆蓋率要隨著下方前台後台等種類的點選變化，兩項分類佔比的橫向長條圖的長條以各顏色標注，新增「工時」對應pdf中的花費時間,以長條分別列出各使用者的時數，並以各使用者的時加總列出總工時，新增各使用者提交數。新增上傳.md形式的檔案讓其他使用者也能夠提交。移除上方說明文字，改為新增一個倒數計時器在上方欄位，並可以由使用者新增倒數計時的目的、日期、時間，字體可以大一點醒目一點。這個開發日誌應該要能夠透過連結邀請除了我以外的共同開發者填寫。\",\n+    \"diff\": null,\n+    \"stat\": null,\n+    \"result\": \"✅ 73 筆整合資料（Git 35 + 工作日誌 9 + 團隊規劃表 29）\\n✅ 倒數計時、.md 上傳、團隊工時面板設計完成\\n⚠️ 發現 db capability 與公開分享互斥 → 與使用者討論後決定改走自建 Firebase／Firestore，做成 Vue 專案裡的正式頁面 /dev-log\",\n+    \"estimateHoursText\": \"約 0.7 小時（18:21–19:01）\",\n+    \"durationHours\": 0.66\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase3\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T19:01:25+08:00\",\n+    \"endTimestamp\": \"2026-09-09T19:22:13+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"test\",\n+    \"topic\": \"行動裝置版面回饋、使用者身份合併與儀表板壓縮\",\n+    \"category\": \"系統\",\n+    \"summary\": \"使用者回報手機瀏覽器看到舊版資料（其實是尚未重新整理，而非快取問題），並提供桌面版截圖：LI,TZU-CHIEH 與 AN4114760 其實分別是 li220fish、Archi 的另一組 git 身份，儀表板卡片太大、長條圖沒有顏色。將使用者身份合併邏輯寫進 build-dev-log.mjs，儀表板改為預設收合、卡片改成固定寬度橫向捲動，長條圖加上色點。\",\n+    \"prompt\": \"不登入也能看到最新版，另外LI,TZU-CHIEH是li220fish, AN4114760是Archi，然後根據上面的截圖，dashboard太大了，調整每個block的寬度，dashboard高度不能超過畫面的1/4，長條圖的bar要上色\",\n+    \"diff\": \"// 同一個人、不同 git 身份 —— 合併成單一顯示名稱\\nconst USER_ALIASES = {\\n  'LI,TZU-CHIEH': 'li220fish',\\n  AN4114760: 'Archi',\\n};\\nfunction canonicalUser(name) {\\n  return USER_ALIASES[name] || name;\\n}\",\n+    \"stat\": \"使用者別名合併邏輯\",\n+    \"result\": \"✅ 使用者從 5 個合併為 3 個\\n✅ 儀表板預設收合，展開後改為橫向捲動的固定寬度卡片\\n✅ 每個長條圖項目加上色點，分類／使用者顏色一致對應\",\n+    \"estimateHoursText\": \"約 0.35 小時（19:01–19:22）\",\n+    \"durationHours\": 0.35\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase4\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T19:22:13+08:00\",\n+    \"endTimestamp\": \"2026-09-09T19:29:03+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"dev\",\n+    \"topic\": \"統計卡片合併同一行\",\n+    \"category\": \"系統\",\n+    \"summary\": \"原本 KPI、分類長條圖、團隊統計三組卡片各自獨立換行，展開後仍佔三排。改用 CSS display:contents 把外層分組 div「拆除」，讓裡面的卡片直接參與外層 flex 容器排版，三組卡片合併成一條可橫向捲動的列。\",\n+    \"prompt\": \"這些block看起來可以放在同一行\",\n+    \"diff\": \"/* 分組 wrapper 不佔版面，子元素直接參與外層 flex 排版 */\\n.tile-group { display: contents; }\",\n+    \"stat\": \"display:contents 合併卡片列\",\n+    \"result\": \"✅ 全部卡片（KPI + 分類長條圖 + 團隊統計）合併為單一橫向捲動列，高度大幅縮減\",\n+    \"estimateHoursText\": \"約 0.1 小時（19:22–19:29）\",\n+    \"durationHours\": 0.11\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase5\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T19:29:03+08:00\",\n+    \"endTimestamp\": \"2026-09-09T19:41:49+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"dev\",\n+    \"topic\": \"新增逐筆編輯功能，改抓 GitHub 全分支 commit\",\n+    \"category\": \"系統\",\n+    \"summary\": \"設計 devlog_overrides：每筆項目可疊加一份「修正」而不動到原始 git／工作日誌／團隊表資料，Vue 版接上真正的 Firestore、Artifact 版則用 Claude db capability 或退回 localStorage。同時在 build-dev-log.mjs 執行前加上 git fetch --all，這一跑就抓到 li220fish 在 develop 分支上、還沒 merge 進 backstage 因此完全沒被算進來的一筆 commit。\",\n+    \"prompt\": \"好，時間軸的旁邊要新增編輯該軸的內容，Li220fish有些工時沒有被登記到，這樣他才能補登，時間軸來源的部分要抓https://github.com/Li220Fish/motorcycle-verification-platform/branches裡面三個協作者commit的內容跟時間戳\",\n+    \"diff\": \"// 每個 base entry 疊上一份使用者自己填寫的修正，undefined 代表\\n// 「這個欄位沒人動過，維持原樣」（跟 null 不同，null 代表刻意清空）\\nfunction applyOverride(entry, override) {\\n  if (!override) return entry;\\n  const next = { ...entry, edited: true };\\n  if (override.hours != null) {\\n    next.durationMs = override.hours * 3600000;\\n    if (next.source === 'team-sheet') next.laborHours = override.hours;\\n  }\\n  return next;\\n}\\n\\n// build-dev-log.mjs 開頭新增：\\ntry {\\n  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });\\n} catch (err) {\\n  console.warn('git fetch --all failed — using local history only:', err.message);\\n}\",\n+    \"stat\": \"devlog_overrides 疊加邏輯 + git fetch --all\",\n+    \"result\": \"✅ 逐筆編輯 UI（Vue／Artifact 同步）完成\\n✅ git fetch --all 抓到 develop 分支上漏掉的 1 筆 commit，資料筆數由 73 增為 74\",\n+    \"estimateHoursText\": \"約 0.2 小時（19:29–19:41）\",\n+    \"durationHours\": 0.21\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase6\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T19:41:49+08:00\",\n+    \"endTimestamp\": \"2026-09-09T19:51:14+08:00\",\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"maint\",\n+    \"topic\": \"Commit、push 並首次部署到 Firebase\",\n+    \"category\": \"系統\",\n+    \"summary\": \"只 git add 這次功能相關的檔案，刻意避開使用者原本就存在、尚未提交的其他變更（.gitignore／package.json／storage.rules），避免混進無關的改動。詢問並取得同意後 commit 到 backstage、push 到 GitHub，接著部署 Firestore 規則與 Hosting build。\",\n+    \"prompt\": \"commi到我的branch然後部署到firebase上，如果其他使用者也有用claude也能同步\",\n+    \"diff\": null,\n+    \"stat\": null,\n+    \"result\": \"✅ commit 5facb36 推上 origin/backstage\\n✅ Firestore 規則與 Hosting 部署完成，/dev-log 正式上線於 motorcycle-verification.web.app\\n✅ 確認任何 Claude 帳號（甚至沒有帳號）都能同步讀寫，因為完全不依賴 Claude 的 db capability，走的是專案自己的 Firestore\",\n+    \"estimateHoursText\": \"約 0.15 小時（19:41–19:51）\",\n+    \"durationHours\": 0.16\n+  },\n+  {\n+    \"id\": \"manual-devlog-phase8\",\n+    \"source\": \"manual-log\",\n+    \"user\": \"Archi\",\n+    \"timestamp\": \"2026-09-09T19:56:15+08:00\",\n+    \"endTimestamp\": null,\n+    \"timePrecision\": \"minute\",\n+    \"type\": \"maint\",\n+    \"topic\": \"把開發日誌本身的開發過程同步進時間軸\",\n+    \"category\": \"系統\",\n+    \"summary\": \"這套時間軸工具原本只記錄「ride騎吧」App 本身的開發，沒有記錄自己被開發出來的過程。從這一輪對話的 session 逐字稿裡撈出真實的訊息時間戳，比對出四個 Artifact 階段性迭代（初版、整合工作日誌／團隊表、行動裝置回饋與壓縮、卡片合併同一行）並沒有對應的 git commit（Artifact 檔案本身不在版控裡），因此以 manual-log 補上；另外也在 build-dev-log.mjs 加上清除 <ide_selection>／<system-reminder> 標籤的邏輯，避免這類工具注入的雜訊混進擷取到的 prompt 內容。\",\n+    \"prompt\": \"把開發這套日誌的專案內容同步到時間軸上\",\n+    \"diff\": \"// 這類標籤是編輯器/系統注入的上下文，不是使用者實際打的字，\\n// 跟 system-reminder 一樣要在擷取 prompt 前先剝掉：\\nconst text = rawText\\n  .replace(/<ide_selection>[\\\\s\\\\S]*?<\\\\/ide_selection>/g, '')\\n  .replace(/<system-reminder>[\\\\s\\\\S]*?<\\\\/system-reminder>/g, '')\\n  .trim();\",\n+    \"stat\": \"清除 IDE 注入標籤的 prompt 清理邏輯\",\n+    \"result\": \"✅ 新增 5 筆 manual-log 項目，補上這套工具自己開發過程中、沒有對應 git commit 的階段\\n✅ 修正 prompt 擷取邏輯，5facb36 那筆 commit 顯示的原始 prompt 不再夾帶 IDE 選取內容雜訊\",\n+    \"estimateHoursText\": \"約 0.15 小時\",\n+    \"durationHours\": 0.15\n   }\n ]\ndiff --git a/src/data/dev-log.json b/src/data/dev-log.json\nindex 2168667..4804bf7 100644\n--- a/src/data/dev-log.json\n+++ b/src/data/dev-log.json\n@@ -1,28 +1,28 @@\n {\n   \"summary\": {\n-    \"generatedAt\": \"2026-09-09T11:30:38.348Z\",\n-    \"totalEntries\": 74,\n-    \"entriesWithTimedPrompt\": 33,\n-    \"totalTimedDurationMs\": 601843199,\n+    \"generatedAt\": \"2026-09-09T12:01:38.726Z\",\n+    \"totalEntries\": 83,\n+    \"entr
```

（此 diff 內容過長，已截斷，僅顯示部分）

</details>

#### 結果
已提交 commit 66a57e0

#### 時數
0.1

---

## 時間未定

### 引擎音檔波形處理

- 使用者：Archi
- 分類：檢定辨識
- 類型：測試

#### 摘要
將錄音檔轉成音波量化資料

#### 結果
需求已確定，等待實作

#### 時數
0

---
