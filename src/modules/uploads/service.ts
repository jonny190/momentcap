import { createWriteStream } from "fs"
import { open, readdir, rename, rm, stat } from "fs/promises"
import { join } from "path"
import { Readable, Transform } from "stream"
import { pipeline } from "stream/promises"
import { limits, paths } from "@/modules/core/config"
import { db } from "@/modules/core/db"
import { newId } from "@/modules/core/http"
import { resolveFileType, sniffKind } from "@/modules/media/file-types"
import { enqueue } from "@/modules/media/queue"
import { insertMedia } from "@/modules/media/repo"
import { absolute, ensureDirs, freeBytes, relativeOriginal } from "@/modules/media/storage"
import type { MediaKind } from "@/modules/media/types"

/**
 * Resumable chunked uploads.
 *
 * Phones on venue wifi drop connections constantly, and Cloudflare caps a
 * single request at 100MB, so files are sent in chunks. The server's copy
 * of the partial file is the source of truth: a client that loses track of
 * where it was gets told the current offset and carries on from there.
 */

export class UploadError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message)
  }
}

type UploadRow = {
  id: string
  kind: MediaKind
  mime: string
  size: number
  original_name: string | null
  guest_name: string | null
  device_id: string | null
}

export type InitInput = {
  name: string
  type: string
  size: number
  guestName?: string | null
  deviceId?: string | null
}

const STALE_MS = 24 * 60 * 60 * 1000
const locks = new Set<string>()

function tmpFile(id: string) {
  return join(paths.tmp, `${id}.part`)
}

export function cleanGuestName(name: unknown): string | null {
  if (typeof name !== "string") return null
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, 60)
  return trimmed || null
}

export function cleanDeviceId(id: unknown): string | null {
  return typeof id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null
}

export async function initUpload(input: InitInput) {
  const type = resolveFileType(input.type ?? "", input.name ?? "")
  if (!type) throw new UploadError(415, "Only photos and videos can be uploaded")

  const size = Number(input.size)
  const max = type.kind === "photo" ? limits.maxPhotoBytes : limits.maxVideoBytes
  if (!Number.isInteger(size) || size <= 0) throw new UploadError(400, "Missing file size")
  if (size > max) throw new UploadError(413, `That ${type.kind} is too large`)

  await ensureDirs()
  if ((await freeBytes()) - size < limits.minFreeBytes) {
    throw new UploadError(507, "The album is out of storage space")
  }

  const id = newId()
  db()
    .prepare(
      `INSERT INTO upload (id, kind, mime, size, original_name, guest_name, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, type.kind, type.mime, size, String(input.name ?? "").slice(0, 200), cleanGuestName(input.guestName), cleanDeviceId(input.deviceId))
  await (await open(tmpFile(id), "w")).close()

  void sweepStaleUploads()
  return { uploadId: id, chunkSize: limits.chunkBytes }
}

function getUpload(id: string): UploadRow {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new UploadError(404, "Upload not found")
  const row = db().prepare("SELECT * FROM upload WHERE id = ?").get(id) as UploadRow | undefined
  if (!row) throw new UploadError(404, "Upload not found")
  return row
}

async function receivedBytes(id: string): Promise<number> {
  try {
    return (await stat(tmpFile(id))).size
  } catch {
    throw new UploadError(404, "Upload not found")
  }
}

export async function uploadStatus(id: string) {
  const row = getUpload(id)
  return { received: await receivedBytes(id), size: row.size }
}

/** Appends one chunk at the given offset. Returns the new byte count. */
export async function appendChunk(id: string, offset: number, body: ReadableStream<Uint8Array> | null) {
  const row = getUpload(id)
  if (!body) throw new UploadError(400, "Empty chunk")
  if (locks.has(id)) throw new UploadError(409, "Chunk already in progress", { received: await receivedBytes(id) })

  locks.add(id)
  try {
    const received = await receivedBytes(id)
    if (offset !== received) throw new UploadError(409, "Offset mismatch", { received })

    const allowed = Math.min(limits.chunkBytes, row.size - received)
    let count = 0
    const guard = new Transform({
      transform(chunk: Buffer, _enc, done) {
        count += chunk.length
        if (count > allowed) done(new UploadError(413, "Chunk larger than expected"))
        else done(null, chunk)
      },
    })

    try {
      await pipeline(Readable.fromWeb(body as never), guard, createWriteStream(tmpFile(id), { flags: "a" }))
    } catch (err) {
      // A dropped connection leaves a partial chunk on disk. That is fine:
      // the client asks for the offset and resends from there.
      if (err instanceof UploadError) {
        await truncateTo(id, received)
        throw err
      }
      throw new UploadError(400, "Chunk interrupted", { received: await receivedBytes(id) })
    }
    return { received: await receivedBytes(id) }
  } finally {
    locks.delete(id)
  }
}

async function truncateTo(id: string, size: number) {
  const fh = await open(tmpFile(id), "r+")
  try {
    await fh.truncate(size)
  } finally {
    await fh.close()
  }
}

/** Moves a finished upload into the album and queues its previews. */
export async function completeUpload(id: string) {
  const row = getUpload(id)
  const received = await receivedBytes(id)
  if (received !== row.size) throw new UploadError(409, "Upload incomplete", { received })

  const head = Buffer.alloc(16)
  const fh = await open(tmpFile(id), "r")
  try {
    await fh.read(head, 0, 16, 0)
  } finally {
    await fh.close()
  }
  if (sniffKind(head) !== row.kind) {
    await discardUpload(id)
    throw new UploadError(415, "That file does not look like a photo or video")
  }

  const mediaId = newId()
  const ext = resolveFileType(row.mime, row.original_name ?? "")?.ext ?? "bin"
  const originalFile = relativeOriginal(mediaId, ext)
  await rename(tmpFile(id), absolute(originalFile))

  db().transaction(() => {
    insertMedia({
      id: mediaId,
      kind: row.kind,
      guestName: row.guest_name,
      deviceId: row.device_id,
      originalName: row.original_name,
      mime: row.mime,
      size: row.size,
      originalFile,
    })
    db().prepare("DELETE FROM upload WHERE id = ?").run(id)
  })()

  enqueue(mediaId)
  return { mediaId }
}

export async function discardUpload(id: string) {
  db().prepare("DELETE FROM upload WHERE id = ?").run(id)
  await rm(tmpFile(id), { force: true })
}

let lastSweep = 0
async function sweepStaleUploads() {
  if (Date.now() - lastSweep < 60 * 60 * 1000) return
  lastSweep = Date.now()
  const cutoff = new Date(Date.now() - STALE_MS).toISOString()
  const stale = db().prepare("SELECT id FROM upload WHERE created_at < ?").all(cutoff) as { id: string }[]
  for (const { id } of stale) await discardUpload(id)

  // Orphaned partial files with no matching row. Only old ones, so an
  // upload that started a moment ago is never caught mid-creation.
  const known = new Set((db().prepare("SELECT id FROM upload").all() as { id: string }[]).map((r) => r.id))
  for (const file of await readdir(paths.tmp).catch(() => [])) {
    const id = file.replace(/\.part$/, "")
    if (known.has(id)) continue
    const info = await stat(join(paths.tmp, file)).catch(() => null)
    if (info && Date.now() - info.mtimeMs > 60 * 60 * 1000) await rm(join(paths.tmp, file), { force: true })
  }
}
