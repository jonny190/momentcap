import path from "path"

function mb(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value * 1024 * 1024 : fallback * 1024 * 1024
}

/**
 * Everything the app writes lives under DATA_DIR, so one mapped Docker
 * volume holds the database, the originals and the generated previews.
 */
export function dataDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "./data")
}

export const paths = {
  get db() {
    return path.join(dataDir(), "momentcap.db")
  },
  get originals() {
    return path.join(dataDir(), "media", "originals")
  },
  get display() {
    return path.join(dataDir(), "media", "display")
  },
  get thumbs() {
    return path.join(dataDir(), "media", "thumbs")
  },
  get tmp() {
    return path.join(dataDir(), "tmp")
  },
}

export const limits = {
  get maxPhotoBytes() {
    return mb("MAX_PHOTO_MB", 40)
  },
  get maxVideoBytes() {
    return mb("MAX_VIDEO_MB", 1024)
  },
  /** Each chunk stays well below Cloudflare's 100MB request limit. */
  chunkBytes: 8 * 1024 * 1024,
  /** Refuse new uploads when free space on the volume drops below this. */
  minFreeBytes: 1024 * 1024 * 1024,
}

export const ffmpegPath = () => process.env.FFMPEG_PATH ?? "ffmpeg"
export const ffprobePath = () => process.env.FFPROBE_PATH ?? "ffprobe"
