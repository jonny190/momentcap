import { mkdir, rm, statfs } from "fs/promises"
import { join, resolve, sep } from "path"
import { dataDir, paths } from "@/modules/core/config"
import type { Media, Variant } from "./types"

export async function ensureDirs() {
  await Promise.all([paths.originals, paths.display, paths.thumbs, paths.tmp].map((d) => mkdir(d, { recursive: true })))
}

/** Stored filenames are relative to DATA_DIR so the volume can be moved. */
export function absolute(relative: string): string {
  const base = dataDir()
  const full = resolve(base, relative)
  if (!full.startsWith(base + sep)) throw new Error("Path escapes data directory")
  return full
}

export function relativeOriginal(id: string, ext: string) {
  return join("media", "originals", `${id}.${ext}`)
}

export function relativeDisplay(id: string, ext: string) {
  return join("media", "display", `${id}.${ext}`)
}

export function relativeThumb(id: string) {
  return join("media", "thumbs", `${id}.webp`)
}

export function fileForVariant(m: Media, variant: Variant): string | null {
  if (variant === "thumb") return m.thumbFile
  if (variant === "display") return m.displayFile ?? m.originalFile
  return m.originalFile
}

export async function removeMediaFiles(m: Media) {
  const files = [m.originalFile, m.displayFile, m.thumbFile].filter(Boolean) as string[]
  await Promise.all(files.map((f) => rm(absolute(f), { force: true })))
}

export async function freeBytes(): Promise<number> {
  try {
    const s = await statfs(dataDir())
    return s.bavail * s.bsize
  } catch {
    return Number.POSITIVE_INFINITY
  }
}
