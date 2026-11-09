import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { existsSync } from "fs"
import sharp from "sharp"
import { streamOf, useTempDataDir } from "./helpers"
import { appendChunk, completeUpload, initUpload, uploadStatus } from "@/modules/uploads/service"
import { drainQueue } from "@/modules/media/queue"
import { getMedia, listMedia } from "@/modules/media/repo"
import { absolute } from "@/modules/media/storage"

let env: ReturnType<typeof useTempDataDir>
let jpeg: Buffer

beforeAll(async () => {
  env = useTempDataDir()
  // A portrait photo with EXIF orientation 6, like a phone camera produces.
  jpeg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#c08457" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
})
afterAll(() => env.cleanup())

describe("chunked uploads", () => {
  it("accepts a photo in several chunks and builds previews", async () => {
    const { uploadId } = await initUpload({ name: "IMG_0001.JPG", type: "image/jpeg", size: jpeg.length, guestName: "  Sam  ", deviceId: "device-abc-123" })
    const half = Math.floor(jpeg.length / 2)
    await appendChunk(uploadId, 0, streamOf(jpeg.subarray(0, half)))
    expect((await uploadStatus(uploadId)).received).toBe(half)
    await appendChunk(uploadId, half, streamOf(jpeg.subarray(half)))

    const { mediaId } = await completeUpload(uploadId)
    await drainQueue()

    const m = getMedia(mediaId)!
    expect(m.status).toBe("ready")
    expect(m.guestName).toBe("Sam")
    // Rotated by EXIF orientation, so the display copy is portrait.
    expect(m.width).toBe(800)
    expect(m.height).toBe(1200)
    expect(existsSync(absolute(m.thumbFile!))).toBe(true)
    expect(existsSync(absolute(m.displayFile!))).toBe(true)
    expect(listMedia({ audience: "guest" }).items.map((i) => i.id)).toContain(mediaId)
  })

  it("rejects a chunk at the wrong offset and reports where to resume", async () => {
    const { uploadId } = await initUpload({ name: "a.jpg", type: "image/jpeg", size: jpeg.length })
    await appendChunk(uploadId, 0, streamOf(jpeg.subarray(0, 100)))
    await expect(appendChunk(uploadId, 0, streamOf(jpeg.subarray(0, 100)))).rejects.toMatchObject({
      status: 409,
      extra: { received: 100 },
    })
  })

  it("refuses to complete an unfinished upload", async () => {
    const { uploadId } = await initUpload({ name: "a.jpg", type: "image/jpeg", size: jpeg.length })
    await appendChunk(uploadId, 0, streamOf(jpeg.subarray(0, 10)))
    await expect(completeUpload(uploadId)).rejects.toMatchObject({ status: 409 })
  })

  it("rejects bytes beyond the declared size", async () => {
    const { uploadId } = await initUpload({ name: "a.jpg", type: "image/jpeg", size: 50 })
    await expect(appendChunk(uploadId, 0, streamOf(jpeg.subarray(0, 100)))).rejects.toMatchObject({ status: 413 })
    expect((await uploadStatus(uploadId)).received).toBe(0)
  })

  it("rejects a file that is not really an image", async () => {
    const fake = Buffer.from("this is not a jpeg at all, just text")
    const { uploadId } = await initUpload({ name: "x.jpg", type: "image/jpeg", size: fake.length })
    await appendChunk(uploadId, 0, streamOf(fake))
    await expect(completeUpload(uploadId)).rejects.toMatchObject({ status: 415 })
  })

  it("rejects unsupported types and oversized files up front", async () => {
    await expect(initUpload({ name: "doc.pdf", type: "application/pdf", size: 10 })).rejects.toMatchObject({ status: 415 })
    await expect(initUpload({ name: "a.jpg", type: "image/jpeg", size: 500 * 1024 * 1024 })).rejects.toMatchObject({ status: 413 })
  })

  it("accepts HEIC files with an empty browser type by extension", async () => {
    const res = await initUpload({ name: "IMG_1234.HEIC", type: "", size: 1000 })
    expect(res.uploadId).toMatch(/^[a-f0-9]{24}$/)
  })
})
