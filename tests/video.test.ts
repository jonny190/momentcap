import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "fs"
import { streamOf, useTempDataDir } from "./helpers"
import { appendChunk, completeUpload, initUpload } from "@/modules/uploads/service"
import { drainQueue } from "@/modules/media/queue"
import { getMedia } from "@/modules/media/repo"
import { absolute } from "@/modules/media/storage"

/**
 * Needs ffmpeg. Runs when TEST_VIDEO points at a sample clip and
 * FFMPEG_PATH / FFPROBE_PATH (or ffmpeg on PATH) are available.
 */
const sample = process.env.TEST_VIDEO

describe.skipIf(!sample)("video processing", () => {
  let env: ReturnType<typeof useTempDataDir>
  beforeAll(() => (env = useTempDataDir()))
  afterAll(() => env.cleanup())

  it("builds a poster and a browser-friendly mp4 from an iPhone style clip", async () => {
    const clip = readFileSync(sample!)
    const { uploadId } = await initUpload({ name: "IMG_0042.MOV", type: "video/quicktime", size: clip.length })
    await appendChunk(uploadId, 0, streamOf(clip))
    const { mediaId } = await completeUpload(uploadId)
    await drainQueue()

    const m = getMedia(mediaId)!
    expect(m.status).toBe("ready")
    expect(m.kind).toBe("video")
    expect(m.displayFile).toMatch(/\.mp4$/)
    expect(existsSync(absolute(m.displayFile!))).toBe(true)
    expect(existsSync(absolute(m.thumbFile!))).toBe(true)
    expect(m.duration).toBeGreaterThan(3)
    // Shot in portrait, so the poster should come out taller than wide.
    expect(m.height!).toBeGreaterThan(m.width!)
  }, 120_000)
})
