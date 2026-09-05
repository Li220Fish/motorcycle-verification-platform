import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

/** Static per-platform binaries — `npm install` resolves the correct OS/arch
 *  variant automatically (Cloud Functions builds on Linux x64, this dev
 *  machine resolves win32-x64; verified locally before relying on this). */
export const FFMPEG_PATH = ffmpegInstaller.path
export const FFPROBE_PATH = ffprobeInstaller.path
