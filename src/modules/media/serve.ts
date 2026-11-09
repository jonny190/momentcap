import { createReadStream } from "fs"
import { stat } from "fs/promises"
import { Readable } from "stream"
import { contentTypeForFile } from "./file-types"
import { absolute, fileForVariant } from "./storage"
import { exportName } from "./zip"
import type { Media, Variant } from "./types"

/**
 * Serves a media file with HTTP range support. Safari will not play a video
 * unless the server answers range requests with 206 responses.
 */
export async function serveMediaFile(req: Request, m: Media, variant: Variant, download: boolean): Promise<Response> {
  const relative = fileForVariant(m, variant)
  if (!relative) return new Response("Not found", { status: 404 })

  const file = absolute(relative)
  let size: number
  try {
    size = (await stat(file)).size
  } catch {
    return new Response("Not found", { status: 404 })
  }

  const headers = new Headers({
    "Content-Type": variant === "original" ? m.mime : contentTypeForFile(relative),
    "Accept-Ranges": "bytes",
    // Files never change once written, and ids are never reused.
    "Cache-Control": "private, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff",
  })
  if (download) {
    const name = variant === "original" ? exportName(m) : exportName(m).replace(/\.[^.]+$/, relative.slice(relative.lastIndexOf(".")))
    headers.set("Content-Disposition", `attachment; filename="${name}"`)
  }

  const range = parseRange(req.headers.get("range"), size)
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  if (range) {
    const [start, end] = range
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
    headers.set("Content-Length", String(end - start + 1))
    return new Response(toWeb(file, start, end), { status: 206, headers })
  }

  headers.set("Content-Length", String(size))
  return new Response(toWeb(file), { status: 200, headers })
}

function toWeb(file: string, start?: number, end?: number) {
  return Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>
}

export function parseRange(header: string | null, size: number): [number, number] | "invalid" | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, a, b] = match
  let start: number
  let end: number
  if (a === "" && b === "") return "invalid"
  if (a === "") {
    // Suffix range: the last N bytes.
    start = Math.max(size - Number(b), 0)
    end = size - 1
  } else {
    start = Number(a)
    end = b === "" ? size - 1 : Math.min(Number(b), size - 1)
  }
  if (start > end || start >= size) return "invalid"
  return [start, end]
}
