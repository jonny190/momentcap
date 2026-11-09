import { describe, expect, it, beforeEach } from "vitest"
import { parseRange } from "@/modules/media/serve"
import { sniffKind, resolveFileType } from "@/modules/media/file-types"
import { exportName } from "@/modules/media/zip"
import { createSessionValue, verifySessionValue, checkPassword } from "@/modules/auth/session"
import type { Media } from "@/modules/media/types"

describe("parseRange", () => {
  it("handles open, closed and suffix ranges", () => {
    expect(parseRange(null, 100)).toBeNull()
    expect(parseRange("bytes=0-", 100)).toEqual([0, 99])
    expect(parseRange("bytes=0-1", 100)).toEqual([0, 1])
    expect(parseRange("bytes=-10", 100)).toEqual([90, 99])
    expect(parseRange("bytes=50-500", 100)).toEqual([50, 99])
    expect(parseRange("bytes=200-", 100)).toBe("invalid")
  })
})

describe("file types", () => {
  it("sniffs common formats", () => {
    expect(sniffKind(Buffer.from("ffd8ffe000104a4649460001", "hex"))).toBe("photo")
    expect(sniffKind(Buffer.from("000000186674797068656963000000", "hex"))).toBe("photo")
    expect(sniffKind(Buffer.from("00000020667479707174202000000000", "hex"))).toBe("video")
    expect(sniffKind(Buffer.from("1a45dfa3a3428681010000000000", "hex"))).toBe("video")
    expect(sniffKind(Buffer.from("hello world, plain"))).toBeNull()
  })
  it("falls back to the extension", () => {
    expect(resolveFileType("", "clip.MOV")?.kind).toBe("video")
    expect(resolveFileType("application/octet-stream", "x.exe")).toBeNull()
  })
})

describe("exportName", () => {
  it("builds a safe, sortable filename", () => {
    const m = { id: "abcdef123456", createdAt: "2026-06-14T19:32:05.123Z", guestName: "Sam O'Neil / ../", originalFile: "media/originals/abcdef123456.JPG" } as Media
    expect(exportName(m)).toBe("2026-06-14_19-32-05_Sam-O-Neil_abcdef.jpg")
  })
})

describe("admin session", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "secret-pass"
    delete process.env.SESSION_SECRET
  })
  it("round-trips and expires", () => {
    const { value } = createSessionValue(1_000)
    expect(verifySessionValue(value, 2_000)).toBe(true)
    expect(verifySessionValue(value, 1_000 + 15 * 86_400_000)).toBe(false)
  })
  it("rejects tampering and password changes", () => {
    const { value } = createSessionValue()
    expect(verifySessionValue(value.replace(/^\d/, "9"))).toBe(false)
    process.env.ADMIN_PASSWORD = "changed"
    expect(verifySessionValue(value)).toBe(false)
  })
  it("checks the password", () => {
    expect(checkPassword("secret-pass")).toBe(true)
    expect(checkPassword("nope")).toBe(false)
  })
})
