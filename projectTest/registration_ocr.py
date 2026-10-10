"""
行照角點偵測 + 遮罩 + OCR 的獨立 Python 版本。

跟正式後端（functions/src/services/registration-document-scanner.service.ts +
registration-ocr.service.ts）走同一套演算法和 FIELD_ROIS 校正值，只是換成
OpenCV (cv2) + pytesseract，方便在正式 Node/Firebase 環境之外快速測試、調
ROI，不用每次都重新部署 Cloud Function。

用法：
    python registration_ocr.py [圖片路徑]
不給路徑的話預設抓同資料夾裡的 367688.jpg（目前唯一的測試照片）。

輸出：
    <輸入檔名>_warped.jpg   — 透視校正後的文件（未遮罩）
    <輸入檔名>_masked.jpg   — 遮罩版（只露出 FIELD_ROIS 定義的欄位）
    <輸入檔名>_result.json  — 每個欄位的 OCR 文字、原始文字、信心度
    終端機印出同一份結果，中文欄位名稱＋信心度百分比，方便直接看

需求：
    pip install opencv-python-headless pytesseract numpy
    另外要有 Tesseract OCR 執行檔本體（pytesseract 只是呼叫它的 wrapper），
    還有 eng + chi_tra 兩個語言包（顏色欄位是中文字，要 chi_tra 才讀得出
    來）。這兩個檔案放在同資料夾的 tessdata/ 裡（已經放好了），不依賴系統
    安裝的 Tesseract 自帶哪些語言包。
    Windows 上如果 tesseract.exe 不在 PATH，下面 TESSERACT_CMD 可以直接
    指定絕對路徑。
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import pytesseract

# ---------------------------------------------------------------------------
# Tesseract 執行檔路徑 — 這台機器是用 winget 裝的 UB-Mannheim 版本，裝在這裡
# 而不在 PATH 上。换一台機器測試時，要嘛把這行指到正確路徑，要嘛確保
# tesseract 已經在 PATH 上後把這行整行刪掉。
# ---------------------------------------------------------------------------
_DEFAULT_TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if Path(_DEFAULT_TESSERACT_CMD).exists():
    pytesseract.pytesseract.tesseract_cmd = _DEFAULT_TESSERACT_CMD

# 自備 eng + chi_tra 語言包的本機 tessdata 目錄，不依賴系統安裝的 Tesseract
# 自己帶了哪些語言 —— chi_tra.traineddata 是從 tesseract-ocr 官方
# tessdata_fast repo 下載的（https://github.com/tesseract-ocr/tessdata_fast）。
# 用環境變數而不是 --tessdata-dir CLI 參數指定，避免 Windows 路徑的反斜線
# 在 pytesseract 組 config 字串時被引號黏住（實測會發生）。
_TESSDATA_DIR = Path(__file__).parent / "tessdata"
if _TESSDATA_DIR.exists():
    os.environ["TESSDATA_PREFIX"] = str(_TESSDATA_DIR)


# ---------------------------------------------------------------------------
# 跟 functions/src/services/registration-ocr.config.ts 保持同步的校正值 ——
# 用 roi-picker.html（拖方框調整、即時輸出這個格式）校正出來的。
#
# kind 對照：
#   "alnum"      純拉丁字母/數字欄位（引擎號碼、車身號碼）。
#   "alnum_cjk"  拉丁字母/數字，但裁切範圍內混到中文字 —— 目前只有
#                plateNumber：同一格裡「普通重型」（車種）跟「PGT-2263」
#                （牌照）是連在一起的，沒有表格線隔開，沒辦法單靠縮小 ROI
#                切掉中文。用 chi_tra+eng 讓 Tesseract 把「普通重型」正確
#                辨識成中文（即使最後會被清掉），而不是硬塞進純拉丁字母
#                模型、把中文筆畫誤判成一堆雜訊拉丁字母。
#   "digits"     純數字（排氣量）。
#   "date"       數字+小數點（出廠年月）。
#   "cjk"        純中文（顏色）。
#
# 重要：辨識時故意不套 tessedit_char_whitelist —— 實測發現白名單會讓
# Tesseract 回報的 confidence 大幅失真（同一段文字，加白名單後
# confidence 從 ~40% 掉到 0%，辨識出的文字本身沒有變差）。改成「不限制候
# 選字元辨識 → 辨識完再用 _clean_text() 過濾」，信心度才反映真實情況。
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class FieldDef:
    x: float
    y: float
    width: float
    height: float
    kind: str  # 'alnum' | 'alnum_cjk' | 'digits' | 'date' | 'cjk'


FIELD_ROIS: dict[str, FieldDef] = {
    "plateNumber": FieldDef(0.440, 0.037, 0.512, 0.077, "alnum_cjk"),
    "engineNumber": FieldDef(0.173, 0.425, 0.778, 0.065, "alnum"),
    "chassisNumber": FieldDef(0.172, 0.488, 0.776, 0.066, "alnum"),
    "color": FieldDef(0.172, 0.548, 0.360, 0.065, "cjk"),
    "displacement": FieldDef(0.653, 0.548, 0.239, 0.065, "digits"),
    "manufactureDate": FieldDef(0.652, 0.607, 0.298, 0.065, "date"),
}

# 中文欄位名稱 — 只用來讓終端機輸出好讀，不影響辨識邏輯。
FIELD_LABELS: dict[str, str] = {
    "plateNumber": "牌照號碼",
    "engineNumber": "引擎號碼",
    "chassisNumber": "車身號碼",
    "color": "顏色",
    "displacement": "排氣量",
    "manufactureDate": "出廠年月",
}

TESSERACT_LANG: dict[str, str] = {
    "alnum": "eng",
    "alnum_cjk": "chi_tra+eng",
    "digits": "eng",
    "date": "eng",
    "cjk": "chi_tra",
}

MIN_PLAUSIBLE_LENGTH: dict[str, int] = {
    "alnum": 4,
    "alnum_cjk": 4,
    "digits": 2,
    "date": 6,
    "cjk": 1,
}

OCR_UPSCALE_FACTOR = 3
MIN_DOCUMENT_AREA_RATIO = 0.2
DETECTION_MAX_LONG_EDGE = 1600
MASK_COLOR_BGR = (0, 0, 255)  # OpenCV 是 BGR，不是 RGB


@dataclass
class FieldResult:
    text: str | None
    raw_text: str
    confidence: float  # 0-1


@dataclass
class ScanResult:
    warped: np.ndarray
    corners: list[tuple[float, float]]
    fields: dict[str, FieldResult] = field(default_factory=dict)
    masked: np.ndarray | None = None


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """左上/右上/右下/左下 — 跟 TS 版同一個 sum/diff 判斷法，只在文件接近正
    向拍攝（沒有明顯旋轉 45 度）時成立，行照直拍的情境下夠用。"""
    s = pts.sum(axis=1)
    d = pts[:, 0] - pts[:, 1]
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmax(d)]
    bl = pts[np.argmin(d)]
    return np.array([tl, tr, br, bl], dtype=np.float32)


def scan_document(image: np.ndarray) -> tuple[np.ndarray, list[tuple[float, float]]] | None:
    """找出最大的文件形狀四邊形並透視校正拉平。找不到就回傳 None —— 這就是
    拿掉 Gemini isRegistrationDocument 判斷之後，本機端用來頂替的「這根本
    不是一份攤平文件」把關機制。"""
    h, w = image.shape[:2]
    scale = min(1.0, DETECTION_MAX_LONG_EDGE / max(w, h))
    small = cv2.resize(image, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    dilated = cv2.dilate(edges, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    small_area = small.shape[0] * small.shape[1]

    best_quad: np.ndarray | None = None
    best_area = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area <= best_area or area < small_area * MIN_DOCUMENT_AREA_RATIO:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            best_quad = approx.reshape(4, 2).astype(np.float32) / scale
            best_area = area

    if best_quad is None:
        return None

    tl, tr, br, bl = _order_corners(best_quad)

    def dist(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.hypot(*(a - b)))

    out_w = max(1, round(max(dist(tl, tr), dist(bl, br))))
    out_h = max(1, round(max(dist(tl, bl), dist(tr, br))))

    src = np.array([tl, tr, br, bl], dtype=np.float32)
    dst = np.array(
        [[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]], dtype=np.float32
    )
    transform = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(image, transform, (out_w, out_h))
    return warped, [tuple(p) for p in (tl, tr, br, bl)]


def refine_to_inner_border(warped: np.ndarray) -> np.ndarray:
    """第一次 scan_document() 抓的是紙張/護貝套外緣 —— 實測在背景跟紙張對比
    不夠乾淨的照片上（桌墊顏色、陰影、護貝套反光）常常連著一截背景一起框
    進來，導致 FIELD_ROIS 的比例全部跟著偏移，欄位裁到隔壁格（見 test2 的
    案例：偵測到的四邊形上緣整個停在文件實際邊緣之外的桌墊上）。

    行照本身印有一圈粗黑色表格外框，對比度遠高於紙張邊緣，而且就是
    FIELD_ROIS 校正時實際參考的基準。這裡在 warp 後的圖上再抓一次「最大
    的內部矩形」，用它重新 warp 一次，取代原本鬆散的外緣框——找不到就原圖
    放行，不讓這一步變成新的失敗點。"""
    h, w = warped.shape[:2]
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    dilated = cv2.dilate(edges, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    total_area = h * w

    best_quad: np.ndarray | None = None
    best_area = 0.0
    for contour in contours:
        area = cv2.contourArea(contour)
        # 上限排除貼著整張 warp 圖邊緣的雜訊輪廓（那隻其實是外緣本身，不是
        # 內部黑框）；下限沿用跟 scan_document 一樣的「太小就不是文件」邏輯。
        if area <= best_area or area < total_area * 0.3 or area > total_area * 0.96:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            best_quad = approx.reshape(4, 2).astype(np.float32)
            best_area = area

    if best_quad is None:
        return warped

    tl, tr, br, bl = _order_corners(best_quad)

    def dist(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.hypot(*(a - b)))

    out_w = max(1, round(max(dist(tl, tr), dist(bl, br))))
    out_h = max(1, round(max(dist(tl, bl), dist(tr, br))))

    src = np.array([tl, tr, br, bl], dtype=np.float32)
    dst = np.array(
        [[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]], dtype=np.float32
    )
    transform = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(warped, transform, (out_w, out_h))


def _roi_pixels(roi: FieldDef, cols: int, rows: int) -> tuple[int, int, int, int]:
    x = min(cols - 1, round(roi.x * cols))
    y = min(rows - 1, round(roi.y * rows))
    w = max(1, min(cols - x, round(roi.width * cols)))
    h = max(1, min(rows - y, round(roi.height * rows)))
    return x, y, w, h


def render_masked_image(warped: np.ndarray) -> np.ndarray:
    """除了 FIELD_ROIS 定義的欄位，其餘全部塗紅 —— 跟後端
    registration-ocr.service.ts 的 renderMaskedImage 同一個邏輯。"""
    rows, cols = warped.shape[:2]
    masked = np.full_like(warped, MASK_COLOR_BGR, dtype=np.uint8)
    for roi in FIELD_ROIS.values():
        x, y, w, h = _roi_pixels(roi, cols, rows)
        masked[y : y + h, x : x + w] = warped[y : y + h, x : x + w]
    return masked


def _clean_text(text: str, kind: str) -> str:
    if kind == "digits":
        return "".join(c for c in text if c.isdigit())
    if kind == "date":
        return "".join(c for c in text if c.isdigit() or c == ".")
    if kind == "cjk":
        # 去掉空白跟 Tesseract 偶爾夾帶的雜訊符號，中文字本身留著 —— 不像
        # alnum 欄位能用字元白名單限制，CJK 候選字元太多，只能靠後製清理。
        return "".join(c for c in text if not c.isspace() and c not in ".,。，|")
    return "".join(c for c in text.upper() if c.isalnum() or c == "-")


def _trim_to_text_block(gray: np.ndarray, binary: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """FIELD_ROIS 欄位寬度是抓「這格最長可能填多長」校正出來的，字短的文件
    (如本測試的引擎/車身號碼) 裁出來後，字的右邊會留一大段幾乎全白的空
    白，裡面常常混著極小的雜訊斑點(紙張紋理/浮水印邊緣/JPEG 壓縮雜訊)。
    這些斑點本身誤判成字沒什麼影響，但 Tesseract 的版面分析會把它們當成
    這一行的一部分，拖累辨識與信心度（實測：車身號碼裁掉雜訊後，psm 7
    從完全讀不出字變成只有 1 個字元誤判）。

    做法：在二值圖上找連通元件，濾掉「太大」(整列的邊框黑線) 跟「太小」
    (斑點) 的元件只留下像文字筆畫的，再抓最靠左那一群(文件欄位都是靠左
    對齊)的範圍，裁掉右邊其餘空白跟雜訊。找不到像樣的文字元件就原圖放
    行，不讓這一步變成新的失敗點。"""
    h, w = gray.shape[:2]

    # 部分欄位（排氣量／出廠年月）ROI 左緣會帶到前一欄「排氣量／出廠」中文
    # 標籤的殘影，標籤跟分隔直線中間的留白太窄，光靠下面的斷點分群會把
    # 標籤、分隔線、數值全部黏成同一群。分隔線本身是一條幾乎貫穿整個高度
    # 的實心直線（跟字元筆畫的「斷續」不同），比字元本身更好認——直接找
    # 墨點涵蓋 85% 以上高度的欄，從最右邊那條分隔線之後重新裁起，標籤跟
    # 分隔線一次處理掉。沒有這種直線（單欄欄位，如引擎/車身號碼）就不裁。
    ink_full = (binary < 128).astype(np.uint8)
    col_ink_fraction = ink_full.sum(axis=0) / h
    divider_cols = np.where(col_ink_fraction > 0.85)[0]
    if len(divider_cols) > 0:
        cut = int(divider_cols[-1]) + 1
        if cut < w - 1:
            gray = gray[:, cut:]
            binary = binary[:, cut:]
            w = gray.shape[1]

    ink = (binary < 128).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)

    min_area = max(30, int(0.00025 * h * w))
    max_area = int(0.3 * h * w)
    boxes: list[tuple[int, int]] = []
    for i in range(1, count):
        area = int(stats[i, cv2.CC_STAT_AREA])
        box_w = int(stats[i, cv2.CC_STAT_WIDTH])
        if area < min_area or area > max_area or box_w > 0.5 * w:
            continue
        x0 = int(stats[i, cv2.CC_STAT_LEFT])
        boxes.append((x0, x0 + box_w))

    if not boxes:
        return gray, binary

    boxes.sort()
    gap_threshold = int(h * 0.6)
    segments: list[tuple[int, int]] = []
    seg_start, seg_end = boxes[0]
    for box_x0, box_x1 in boxes[1:]:
        if box_x0 - seg_end > gap_threshold:
            segments.append((seg_start, seg_end))
            seg_start = box_x0
        seg_end = max(seg_end, box_x1)
    segments.append((seg_start, seg_end))

    # 挑「最寬」的那一群，不是「最靠左」——部分欄位 ROI 左緣會帶到一小截
    # 前一欄位的中文標籤字殘影或分隔線（如排氣量/出廠年月），那些碎片本身
    # 很窄，實際數值/文字內容幾乎都是當中最寬的一群。
    text_segment = max(segments, key=lambda s: s[1] - s[0])
    pad = int(h * 0.15)
    x0 = max(0, text_segment[0] - pad)
    x1 = min(w, text_segment[1] + pad)
    return gray[:, x0:x1], binary[:, x0:x1]


def ocr_fields(warped: np.ndarray) -> dict[str, FieldResult]:
    rows, cols = warped.shape[:2]
    results: dict[str, FieldResult] = {}

    for key, roi in FIELD_ROIS.items():
        x, y, w, h = _roi_pixels(roi, cols, rows)
        crop = warped[y : y + h, x : x + w]
        upscaled = cv2.resize(
            crop,
            (w * OCR_UPSCALE_FACTOR, h * OCR_UPSCALE_FACTOR),
            interpolation=cv2.INTER_CUBIC,
        )

        # 灰階 + Otsu 自動二值化 —— 實測對這份行照的點陣印表機字體有明顯幫助
        # （拿掉灰點紋背景水印/浮水印的雜訊）：顏色欄位從讀不出來變成正確讀出
        # 「灰」，車身號碼/排氣量/出廠年月也都更穩定。跟「不加白名單」一樣，
        # 是拿同一張照片實際跑過 color/gray/otsu 三種前處理 x psm 7/8 比較
        # 出來的，不是憑空猜的（細節見對話紀錄，這裡就不重複貼測試腳本了）。
        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
        _, preprocessed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        _, preprocessed = _trim_to_text_block(gray, preprocessed)
        preprocessed = cv2.cvtColor(preprocessed, cv2.COLOR_GRAY2BGR)

        # PSM 7 = single line — 每個 ROI 都只有一行字，用預設的全頁版面分析
        # 在真實照片上常常因為旁邊中文標籤而讀出亂碼（跟 TS 版遇到的問題
        # 一樣）。tessdata 目錄透過 TESSDATA_PREFIX 環境變數指定（見檔案
        # 開頭）——試過 --tessdata-dir "<path>" CLI 參數，Windows 路徑含
        # 反斜線時 pytesseract 的 config 字串沒有照 shell 規則處理引號，
        # 傳給 tesseract.exe 的路徑會被引號黏住讀不到檔案；環境變數沒有
        # 這個引號問題。
        #
        # 不套 tessedit_char_whitelist（見上面 FIELD_ROIS 的說明）——不限制
        # 候選字元辨識，結果交給 _clean_text() 事後過濾，confidence 才準。
        config = "--psm 7"
        data = pytesseract.image_to_data(
            preprocessed, lang=TESSERACT_LANG[roi.kind], config=config, output_type=pytesseract.Output.DICT
        )
        words = [w_ for w_ in data["text"] if w_.strip()]
        confidences = [float(c) for c in data["conf"] if c not in ("-1", -1)]
        raw_text = " ".join(words)
        cleaned = _clean_text(raw_text, roi.kind)
        confidence = (sum(confidences) / len(confidences) / 100) if confidences else 0.0

        results[key] = FieldResult(
            text=cleaned if len(cleaned) >= MIN_PLAUSIBLE_LENGTH[roi.kind] else None,
            raw_text=raw_text,
            confidence=round(confidence, 4),
        )
    return results


def process(image_path: Path) -> ScanResult | None:
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"無法讀取圖片: {image_path}")

    scanned = scan_document(image)
    if scanned is None:
        return None
    warped, corners = scanned
    warped = refine_to_inner_border(warped)

    result = ScanResult(warped=warped, corners=corners)
    result.fields = ocr_fields(warped)
    result.masked = render_masked_image(warped)
    return result


def main() -> None:
    # Windows 終端機預設常是 cp950/GBK，不是 UTF-8，中文字會印成亂碼 ——
    # 檔案本身沒事，只是終端機顯示；重新設定成 UTF-8 讓輸出可讀。
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    default_photo = Path(__file__).parent / "367688.jpg"
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_photo
    if not image_path.exists():
        print(f"找不到圖片: {image_path}")
        sys.exit(1)

    result = process(image_path)
    if result is None:
        print("找不到文件形狀的四邊形 —— 視為不是行照照片。")
        sys.exit(1)

    stem = image_path.stem
    out_dir = image_path.parent
    warped_path = out_dir / f"{stem}_warped.jpg"
    masked_path = out_dir / f"{stem}_masked.jpg"
    result_path = out_dir / f"{stem}_result.json"
    cv2.imwrite(str(warped_path), result.warped)
    cv2.imwrite(str(masked_path), result.masked)

    result_payload = {k: vars(v) for k, v in result.fields.items()}
    result_path.write_text(
        json.dumps(result_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"校正後文件: {warped_path.name} ({result.warped.shape[1]}x{result.warped.shape[0]})")
    print(f"遮罩版:     {masked_path.name}")
    print(f"結果 JSON:  {result_path.name}")
    print()
    print("辨識結果：")
    name_width = max(len(FIELD_LABELS.get(k, k)) for k in result.fields)
    for key, item in result.fields.items():
        label = FIELD_LABELS.get(key, key)
        pad = "　" * (name_width - len(label))  # 中文欄寬用全形空白對齊
        value = item.text if item.text is not None else "（辨識失敗）"
        print(f"  {label}{pad}：{value}　(信心度 {item.confidence * 100:.0f}%)")
        if item.text != item.raw_text:
            print(f"    原始文字：{item.raw_text!r}")


if __name__ == "__main__":
    main()
