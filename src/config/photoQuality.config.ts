/**
 * Thresholds for the capture-time photo quality gate (photo-quality.service.ts).
 *
 * WHY A GATE AT ALL: measured on this project's own pipeline — once a photo is
 * underexposed or blown out by glare, no amount of post-processing recovers the
 * lost detail. Contrast stretching an underexposed frame raised its sharpness
 * metric ~300x while the actual contrast-to-noise ratio of the defects in it
 * stayed at 0.1 (i.e. invisible), so "enhance it afterwards" is not an option
 * and would additionally fool any sharpness-based check placed after it. The
 * only effective intervention is asking for a retake while the rider is still
 * standing in front of the bike. See docs/preprocessing-experiments.html.
 *
 * CALIBRATION STATUS: these numbers come from one real verification's six Core
 * Vision photos plus a synthetic degradation sweep. That is enough to order the
 * photos correctly (the thresholds below reproduce the same ranking a human
 * gives them) but NOT enough to call them tuned. They are deliberately in their
 * own file so recalibrating against a larger set of real captures touches one
 * place. Prefer loosening over tightening until that data exists: a false
 * "retake this" on a usable photo costs the user more than letting a marginal
 * one through, because the AI still gets to say `unsure`.
 */

/** Long edge (px) every photo is scaled to before any metric is computed.
 *  Laplacian variance is resolution-dependent, so without a fixed analysis
 *  size the thresholds below would mean different things for different
 *  devices. 640 matches the resolution the reference measurements were taken
 *  at, so those numbers carry over directly. */
export const QUALITY_ANALYSIS_LONG_EDGE = 640

/** Frame is split into this many tiles per axis before measuring sharpness. */
export const QUALITY_TILE_GRID = 4

/**
 * Median-tile sharpness (Laplacian variance). The MEDIAN tile, not the whole
 * frame and not the best tile: a whole-frame average punishes a photo for
 * having large smooth areas (road surface, body panel) that say nothing about
 * focus, while the best tile alone passes a photo where one corner happens to
 * be crisp and everything else is mush. On the six real photos the median tile
 * ranked them in exactly the order a human does; the worst (引擎底部, the shot
 * that has to show oil leaks and chain condition) scored 16.2 against the
 * best's 635.
 */
export const MIN_MEDIAN_TILE_SHARPNESS = 50
export const WARN_MEDIAN_TILE_SHARPNESS = 150

/** Best-tile sharpness — catches a frame where nothing at all is in focus,
 *  independent of how much of it is smooth. */
export const MIN_BEST_TILE_SHARPNESS = 120

/** Mean luminance (0-255). Underexposure indicator. Real night-time captures
 *  measured 34.9-73.3 here; the synthetic well-lit reference was 137. */
export const MIN_MEAN_LUMA = 45

/** Share of pixels at/near full white. Glare/specular blowout indicator —
 *  a synthetic flash reflection produced 2.98%, clean frames 0%. */
export const MAX_CLIPPED_HIGHLIGHT_PCT = 2.0

/** Share of pixels below `DARK_PIXEL_LEVEL`. Separates "dim but readable" from
 *  "most of the frame is crushed to black". */
export const DARK_PIXEL_LEVEL = 40
export const MAX_DARK_PIXEL_PCT = 80

/**
 * Captured frames whose long edge falls below this are flagged: the stored
 * Core Vision evidence of a real verification came back at 640 px because
 * getUserMedia was asked for no particular resolution, and nothing downstream
 * could tell. live-camera.service.ts now requests a usable size, but a device
 * may still refuse it, so the check stays.
 */
export const MIN_CAPTURE_LONG_EDGE = 1024
