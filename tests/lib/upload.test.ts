import { describe, it, expect, vi, beforeEach } from "vitest"
import { saveFile } from "@/lib/upload"

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>()
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  }
})

describe("saveFile", () => {
  it("returns a relative path with tenant/event/filename structure", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" })
    const result = await saveFile(file, "daveys", "wedding")
    expect(result).toMatch(/^daveys\/wedding\/\d+-[a-f0-9]+\.jpg$/)
  })

  it("uses .jpg extension when file has no extension", async () => {
    const file = new File(["data"], "photo", { type: "image/jpeg" })
    const result = await saveFile(file, "daveys", "wedding")
    expect(result).toMatch(/\.jpg$/)
  })
})
