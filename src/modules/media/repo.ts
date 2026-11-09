import { db } from "@/modules/core/db"
import type { Media, MediaKind, MediaStatus } from "./types"

type Row = {
  id: string
  kind: MediaKind
  status: MediaStatus
  guest_name: string | null
  device_id: string | null
  original_name: string | null
  mime: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
  original_file: string
  display_file: string | null
  thumb_file: string | null
  hidden: number
  created_at: string
}

function fromRow(r: Row): Media {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    guestName: r.guest_name,
    deviceId: r.device_id,
    originalName: r.original_name,
    mime: r.mime,
    size: r.size,
    width: r.width,
    height: r.height,
    duration: r.duration,
    originalFile: r.original_file,
    displayFile: r.display_file,
    thumbFile: r.thumb_file,
    hidden: r.hidden === 1,
    createdAt: r.created_at,
  }
}

export type NewMedia = Pick<Media, "id" | "kind" | "guestName" | "deviceId" | "originalName" | "mime" | "size" | "originalFile">

export function insertMedia(m: NewMedia) {
  db()
    .prepare(
      `INSERT INTO media (id, kind, status, guest_name, device_id, original_name, mime, size, original_file)
       VALUES (@id, @kind, 'processing', @guestName, @deviceId, @originalName, @mime, @size, @originalFile)`
    )
    .run(m)
}

export function getMedia(id: string): Media | null {
  const row = db().prepare("SELECT * FROM media WHERE id = ?").get(id) as Row | undefined
  return row ? fromRow(row) : null
}

export type ProcessedFields = {
  displayFile: string | null
  thumbFile: string | null
  width: number | null
  height: number | null
  duration: number | null
}

export function markReady(id: string, f: ProcessedFields) {
  db()
    .prepare(
      `UPDATE media SET status = 'ready', display_file = @displayFile, thumb_file = @thumbFile,
       width = @width, height = @height, duration = @duration WHERE id = @id`
    )
    .run({ id, ...f })
}

export function markFailed(id: string) {
  db().prepare("UPDATE media SET status = 'failed' WHERE id = ?").run(id)
}

export function setHidden(ids: string[], hidden: boolean) {
  const stmt = db().prepare("UPDATE media SET hidden = ? WHERE id = ?")
  db().transaction(() => ids.forEach((id) => stmt.run(hidden ? 1 : 0, id)))()
}

export function deleteMediaRow(id: string) {
  db().prepare("DELETE FROM media WHERE id = ?").run(id)
}

export function listProcessing(): Media[] {
  return (db().prepare("SELECT * FROM media WHERE status = 'processing' ORDER BY created_at").all() as Row[]).map(fromRow)
}

export type ListFilter = {
  /** Guests only ever see finished, visible items. */
  audience: "guest" | "admin"
  kind?: MediaKind
  hiddenOnly?: boolean
  /** Opaque cursor from a previous page, returns older items. */
  before?: string | null
  /** createdAt of the newest item the client has, returns newer items. */
  after?: string | null
  limit?: number
}

export function listMedia(filter: ListFilter): { items: Media[]; nextCursor: string | null } {
  const where: string[] = []
  const args: unknown[] = []
  if (filter.audience === "guest") where.push("status = 'ready' AND hidden = 0")
  if (filter.kind) {
    where.push("kind = ?")
    args.push(filter.kind)
  }
  if (filter.hiddenOnly) where.push("hidden = 1")
  if (filter.before) {
    const [createdAt, id] = decodeCursor(filter.before)
    where.push("(created_at < ? OR (created_at = ? AND id < ?))")
    args.push(createdAt, createdAt, id)
  }
  if (filter.after) {
    where.push("created_at > ?")
    args.push(filter.after)
  }
  const limit = Math.min(Math.max(filter.limit ?? 60, 1), 200)
  const sql = `SELECT * FROM media ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC, id DESC LIMIT ${limit + 1}`
  const rows = (db().prepare(sql).all(...args) as Row[]).map(fromRow)
  const items = rows.slice(0, limit)
  const last = items[items.length - 1]
  const nextCursor = rows.length > limit && last ? encodeCursor(last) : null
  return { items, nextCursor }
}

export function allMediaForExport(): Media[] {
  return (db().prepare("SELECT * FROM media WHERE status != 'failed' ORDER BY created_at").all() as Row[]).map(fromRow)
}

export function mediaStats() {
  const row = db()
    .prepare(
      `SELECT
        SUM(kind = 'photo') AS photos,
        SUM(kind = 'video') AS videos,
        SUM(hidden = 1) AS hidden,
        SUM(status = 'processing') AS processing,
        COUNT(DISTINCT COALESCE(NULLIF(guest_name, ''), device_id)) AS guests,
        COALESCE(SUM(size), 0) AS bytes
       FROM media WHERE status != 'failed'`
    )
    .get() as Record<string, number | null>
  return {
    photos: row.photos ?? 0,
    videos: row.videos ?? 0,
    hidden: row.hidden ?? 0,
    processing: row.processing ?? 0,
    guests: row.guests ?? 0,
    bytes: row.bytes ?? 0,
  }
}

function encodeCursor(m: Media) {
  return Buffer.from(`${m.createdAt}|${m.id}`).toString("base64url")
}

function decodeCursor(cursor: string): [string, string] {
  const [createdAt = "", id = ""] = Buffer.from(cursor, "base64url").toString().split("|")
  return [createdAt, id]
}
