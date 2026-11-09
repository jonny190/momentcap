import type { MediaKind } from "./types"

type FileType = { kind: MediaKind; ext: string; mime: string }

const BY_MIME: Record<string, FileType> = {
  "image/jpeg": { kind: "photo", ext: "jpg", mime: "image/jpeg" },
  "image/png": { kind: "photo", ext: "png", mime: "image/png" },
  "image/webp": { kind: "photo", ext: "webp", mime: "image/webp" },
  "image/heic": { kind: "photo", ext: "heic", mime: "image/heic" },
  "image/heif": { kind: "photo", ext: "heif", mime: "image/heif" },
  "video/mp4": { kind: "video", ext: "mp4", mime: "video/mp4" },
  "video/quicktime": { kind: "video", ext: "mov", mime: "video/quicktime" },
  "video/webm": { kind: "video", ext: "webm", mime: "video/webm" },
  "video/3gpp": { kind: "video", ext: "3gp", mime: "video/3gpp" },
}

const BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
}

/**
 * Works out what the browser says it is sending. Some browsers report an
 * empty type for HEIC files, so the file extension is used as a fallback.
 */
export function resolveFileType(mime: string, name: string): FileType | null {
  const direct = BY_MIME[mime.toLowerCase()]
  if (direct) return direct
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const fromExt = BY_EXT[ext]
  return fromExt ? BY_MIME[fromExt] : null
}

/** Checks the first bytes of a file so a renamed file cannot pass as media. */
export function sniffKind(head: Buffer): MediaKind | null {
  if (head.length < 12) return null
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "photo"
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "photo"
  if (head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP") return "photo"
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "video"
  if (head.toString("ascii", 4, 8) === "ftyp") {
    const brand = head.toString("ascii", 8, 12)
    if (["heic", "heix", "heim", "heis", "mif1", "msf1", "avif"].includes(brand)) return "photo"
    return "video"
  }
  return null
}

export function contentTypeForFile(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase() ?? ""
  return BY_EXT[ext] ?? "application/octet-stream"
}
