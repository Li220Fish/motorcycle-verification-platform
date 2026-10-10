# OS 推播通知(FCM)排錯紀錄

**日期：** 2026-09-22
**症狀：** 實作完整的 OS 層級推播通知功能後（client 端 `@capacitor/push-notifications` + 後端 `sendPushToUser` + `onMessageCreated` 觸發），實機（Xiaomi/MIUI，型號 `2311DRK48G`）呼叫 `PushNotifications.register()` 一律立即失敗：
```
E FirebaseMessaging: Topic sync or token retrieval failed on hard failure exceptions:
java.util.concurrent.ExecutionException: java.io.IOException: SERVICE_NOT_AVAILABLE. Won't retry the operation.
```
**結論：** 程式碼與 Firebase 專案設定從頭到尾都正確；根本原因是**這台測試裝置上 Google Play 服務與 Google 伺服器之間的「報到」（checkin）憑證已損壞/過期**，導致所有需要裝置憑證驗證的服務（含 FCM）被拒絕，但不依賴這份憑證的其他 Google 服務（Play 商店個人化、Play 安全防護掃描）仍正常運作，因而具有高度誤導性。

---

## 排除過程（依實際排查順序）

以下每一項都經過**實機驗證後排除**，而非理論推測，供之後遇到類似 `SERVICE_NOT_AVAILABLE` 時參考排查順序：

| # | 懷疑方向 | 驗證方式 | 結果 |
|---|---|---|---|
| 1 | 網路連線 | `ping 8.8.8.8`、`ping firebaseinstallations.googleapis.com` | 正常 |
| 2 | 裝置時鐘/時區 | 檢查系統時間、`auto_time` 設定 | 正常 |
| 3 | Google Play 服務版本過舊 | `dumpsys package com.google.android.gms` | v26.34.36，當前版本 |
| 4 | SHA-1 簽章憑證未註冊 | `firebase apps:android:sha:create` 補註冊、重新產生 `google-services.json` | 註冊後仍失敗，排除 |
| 5 | 我們自己 App 的本地資料/登入狀態 | `pm clear com.motorcycleverify.app` 後重新登入 | 仍失敗，排除 |
| 6 | MIUI 省電限制擋住 Google Play 服務 | `dumpsys deviceidle whitelist` | 已在白名單內（`system-excidle`/`system`），非問題 |
| 7 | 我們自己 App 沒有背景啟動權限 | MIUI「背景啟動管理」，開啟後重測 | 仍失敗（此設定本來就只影響「喚醒顯示通知」，不影響註冊） |
| 8 | 裝置上並存 microG（`com.mgoogle.android.gms`）與 ReVanced 專用 Play 服務（`app.revanced.android.gms`）互相干擾 | `pm disable-user` 徹底停用兩者並 `force-stop` 確認進程已死，重測 | 仍失敗，排除 |
| 9 | 裝置未通過 Google Play Protect 認證 | 開啟 Play 安全防護（`VerifyAppsSettingsActivity`），確認能正常掃描並回報 | 正常，排除 |
| 10 | Firebase 專案未啟用 Firebase Cloud Messaging API | Google Cloud Console → API 程式庫 → `fcm.googleapis.com` | 顯示「管理」，已啟用 |
| 11 | Firebase 專案未啟用 Firebase Installations API | Google Cloud Console → API 程式庫 → `firebaseinstallations.googleapis.com` | 顯示「管理」，已啟用 |
| 12 | Android API 金鑰限制擋掉相關 API | Cloud Console → 憑證 → Android key → 檢查「可透過這個金鑰存取的 API」清單 | 「FCM Registration API」「Firebase Installations API」皆已在允許清單內 |
| 13 | 特定網域被 DNS/防火牆封鎖 | `ping` 個別解析 `firebaseinstallations.googleapis.com`、`fcmregistrations.googleapis.com`；瀏覽器直接開啟該網址確認收到 Google 伺服器的真實 404 回應 | 網路層完全正常 |
| 14 | **Google Play 服務本地報到（checkin）憑證損壞** | `pm clear com.google.android.gms` + `pm clear com.google.android.gsf` + 重開機，讓裝置重新完成報到 | **問題解決**，成功取得 FCM token |

## 關鍵線索

排錯過程中曾在完整 log（不只過濾 App 自己印出的那一行）中看到更詳細的例外堆疊：
```
Caused by: com.google.firebase.installations.FirebaseInstallationsException:
Firebase Installations Service is unavailable. Please try again later.
	at com.google.firebase.installations.remote.FirebaseInstallationServiceClient.generateAuthToken(...)
```
這代表卡住的不是 GCM/推播本身，而是更前一步的 **Firebase Installations**（FCM 在拿到推播 token 之前，必須先透過這支 API 換到裝置的 Firebase Installation ID）。這個線索把排查方向從「網路/專案設定」導向「裝置本身跟 Google 的信任關係」，最終確認是本地報到憑證的問題。

## 最終修復步驟

```bash
adb shell pm clear com.google.android.gms
adb shell pm clear com.google.android.gsf
adb reboot
```

重開機並確認開機完成後，不需要重新登入 Google 帳號（帳號憑證本身沒有被清除，只是清空了本地報到快取），裝置會在背景自動重新完成一次完整的 checkin 流程。**這個過程需要一點時間**（實測約 20～30 秒），重開機後立刻測試仍可能短暫看到不同型態的暫時性錯誤（`Topic operation failed: SERVICE_NOT_AVAILABLE. Will retry Topic operation.`，注意是「會重試」而非原本的「不會重試」），屬正常現象，稍等片刻即會恢復正常並成功取得 token。

⚠️ **影響範圍提醒**：此操作會清除整支手機上 Google Play 服務與 Google Services Framework 的本地資料，理論上可能短暫影響其他依賴 Google 帳號的 App（如需要重新整理登入狀態的 App）。本次操作後未觀察到 Google 帳號登出或其他 App 異常。

## 端到端驗證方式

修復後透過 Firebase Auth REST API + Firestore REST API，以 `agent@test.com`（密碼 `test1234`）身份模擬真實使用者，建立與 `user1@test.com` 的對話並送出一則文字訊息，觸發 `functions/src/functions/notifications/on-message-created.ts` → `functions/src/services/push.service.ts` 的 `sendPushToUser()`。確認手機在**鎖屏、App 完全關閉**的狀態下，成功跳出系統層級的推播通知橫幅（顯示寄件者名稱與訊息內容），驗證完整。

## 相關程式碼（本次功能開發、非本文重點，供對照）

- `src/services/firebase/push-notification.service.ts` — client 端註冊/token 儲存
- `functions/src/services/push.service.ts` — 後端依 `users/{uid}/fcmTokens` 送出推播、清理失效 token
- `functions/src/functions/notifications/on-message-created.ts` — 聊天訊息觸發推播
- `firestore.rules` 的 `fcmTokens` 子集合規則
