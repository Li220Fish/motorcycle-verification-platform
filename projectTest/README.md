# 行照角點偵測 + 遮罩 + OCR（Python 測試版）

跟正式後端 `functions/src/services/registration-document-scanner.service.ts` +
`registration-ocr.service.ts` 同一套演算法和 ROI 校正值的獨立 Python 版本，
方便在 Node/Firebase 環境之外快速測試、調整。

## 安裝

```bash
pip install -r requirements.txt
```

另外需要 Tesseract OCR 本體（pytesseract 只是呼叫它的 wrapper，不是純
Python 實作）：

- Windows：`winget install UB-Mannheim.TesseractOCR`，或去
  https://github.com/UB-Mannheim/tesseract/wiki 下載安裝檔。
- 如果裝完 `tesseract` 不在 PATH 上，改 `registration_ocr.py` 開頭的
  `_DEFAULT_TESSERACT_CMD` 指向實際安裝路徑（這台機器目前是
  `C:\Program Files\Tesseract-OCR\tesseract.exe`）。

語言包（`tessdata/` 資料夾，已經放好不用再弄）：

- `eng.traineddata` — 從系統安裝的 Tesseract 複製來的。
- `chi_tra.traineddata` — 「顏色」欄位是中文字，需要繁體中文語言包才讀得
  出來，從官方 https://github.com/tesseract-ocr/tessdata_fast 下載。

這支程式用 `--tessdata-dir` 指到自己這份 `tessdata/`，不依賴系統 Tesseract
本身裝了哪些語言——換一台機器也不用重新裝語言包，整個資料夾帶著走就好。

## 使用

```bash
python registration_ocr.py [圖片路徑]
```

不給路徑的話預設用同資料夾的 `367688.jpg`。執行後會在同資料夾產生：

- `<檔名>_warped.jpg` — 透視校正後的文件（未遮罩）
- `<檔名>_masked.jpg` — 遮罩版，只露出六個欄位
- `<檔名>_result.json` — 每個欄位的 OCR 文字、原始文字、信心度
- 終端機印出同一份結果，中文欄位名稱＋信心度百分比

## 跟正式後端的差異

- 正式後端用 OpenCV.js（WASM）+ Tesseract.js；這裡用 opencv-python +
  pytesseract，演算法完全一樣，只是換語言/函式庫實作。
- 這支只做本機 OCR，沒有 Gemini 備援那段邏輯。
- ROI 校正值（`FIELD_ROIS`）要跟
  `functions/src/services/registration-ocr.config.ts` 手動保持同步 —
  調整其中一邊記得另一邊也要改。
