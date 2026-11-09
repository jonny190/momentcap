import { ZipArchive } from "archiver"
import { createReadStream } from "fs"
import { extname } from "path"
import { Readable } from "stream"
import { absolute } from "./storage"
import type { Media } from "./types"

/** Readable, sortable names, e.g. 2026-06-14_19-32-05_Sam_ab12cd.jpg */
export function exportName(m: Media): string {
  const stamp = m.createdAt.slice(0, 19).replace("T", "_").replace(/:/g, "-")
  const who = (m.guestName ?? "guest").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "guest"
  return `${stamp}_${who}_${m.id.slice(0, 6)}${extname(m.originalFile).toLowerCase()}`
}

/**
 * Streams a ZIP of the original files. Nothing is held in memory, so a
 * gallery of any size can be downloaded. Media files are already
 * compressed, so they are stored rather than deflated.
 */
export function zipStream(items: Media[], signal?: AbortSignal): ReadableStream<Uint8Array> {
  const archive = new ZipArchive({ store: true })
  archive.on("warning", (err) => console.warn("[zip]", err))
  signal?.addEventListener("abort", () => archive.abort())

  for (const m of items) {
    const folder = m.kind === "video" ? "videos" : "photos"
    archive.append(createReadStream(absolute(m.originalFile)), {
      name: `${folder}/${exportName(m)}`,
      date: new Date(m.createdAt),
    })
  }
  void archive.finalize()
  return Readable.toWeb(archive) as ReadableStream<Uint8Array>
}
