import { spawn } from "child_process"
import { readFile } from "fs/promises"
import sharp from "sharp"
import { ffmpegPath, ffprobePath } from "@/modules/core/config"
import { absolute, relativeDisplay, relativeThumb } from "./storage"
import type { ProcessedFields } from "./repo"
import type { Media } from "./types"

const DISPLAY_MAX = 2048
const THUMB_MAX = 480

/**
 * Builds the web-friendly copies. The original file is never modified, so
 * downloads always get exactly what the guest's phone produced.
 */
export async function processMedia(m: Media): Promise<ProcessedFields> {
  return m.kind === "photo" ? processPhoto(m) : processVideo(m)
}

async function decodablePhoto(m: Media): Promise<Buffer | string> {
  const input = absolute(m.originalFile)
  if (!/^image\/hei[cf]$/.test(m.mime)) return input
  // Prebuilt sharp cannot decode HEVC-based HEIC, so convert it in wasm first.
  const { default: convert } = await import("heic-convert")
  const jpeg = await convert({ buffer: await readFile(input), format: "JPEG", quality: 0.92 })
  return Buffer.from(jpeg)
}

async function processPhoto(m: Media): Promise<ProcessedFields> {
  const source = await decodablePhoto(m)
  const displayFile = relativeDisplay(m.id, "jpg")
  const thumbFile = relativeThumb(m.id)

  // rotate() applies the EXIF orientation; metadata (including GPS) is not
  // copied to the derived files.
  const display = await sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width: DISPLAY_MAX, height: DISPLAY_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(absolute(displayFile))

  await sharp(source)
    .rotate()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(absolute(thumbFile))

  return { displayFile, thumbFile, width: display.width, height: display.height, duration: null }
}

async function processVideo(m: Media): Promise<ProcessedFields> {
  const input = absolute(m.originalFile)
  const probe = await ffprobe(input)
  if (probe === "missing") {
    // No ffmpeg available: keep the video downloadable and playable as-is.
    return { displayFile: null, thumbFile: null, width: null, height: null, duration: null }
  }

  const thumbFile = relativeThumb(m.id)
  const poster = await run(ffmpegPath(), [
    "-v", "error",
    "-ss", probe.duration > 1 ? "0.5" : "0",
    "-i", input,
    "-frames:v", "1",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1",
  ])
  const thumb = await sharp(poster)
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside" })
    .webp({ quality: 72 })
    .toFile(absolute(thumbFile))

  // A 720p H.264 copy plays in every browser, including iPhone HEVC
  // footage on desktop Chrome and Android WebM in Safari.
  const displayFile = relativeDisplay(m.id, "mp4")
  await run(ffmpegPath(), [
    "-v", "error",
    "-y",
    "-i", input,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", "scale='if(gte(iw,ih),-2,min(720,iw))':'if(gte(iw,ih),min(720,ih),-2)',format=yuv420p",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "26",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    absolute(displayFile),
  ], 30 * 60 * 1000)

  return {
    displayFile,
    thumbFile,
    width: thumb.width,
    height: thumb.height,
    duration: probe.duration || null,
  }
}

type Probe = { duration: number }

async function ffprobe(input: string): Promise<Probe | "missing"> {
  try {
    const out = await run(ffprobePath(), ["-v", "error", "-show_entries", "format=duration", "-of", "json", input])
    const parsed = JSON.parse(out.toString()) as { format?: { duration?: string } }
    return { duration: Number(parsed.format?.duration) || 0 }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "missing"
    throw err
  }
}

function run(bin: string, args: string[], timeoutMs = 2 * 60 * 1000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] })
    const out: Buffer[] = []
    let err = ""
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs)
    child.stdout.on("data", (d: Buffer) => out.push(d))
    child.stderr.on("data", (d: Buffer) => (err += d.toString()))
    child.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(Buffer.concat(out))
      else reject(new Error(`${bin} exited with ${code}: ${err.slice(0, 500)}`))
    })
  })
}
