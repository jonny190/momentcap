import { describe, it, expect, vi } from "vitest"
import { createEventZip } from "@/lib/zip"

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>()
  return {
    ...actual,
    createReadStream: vi.fn().mockReturnValue({
      pipe: vi.fn(),
      on: vi.fn(),
    }),
  }
})

describe("createEventZip", () => {
  it("returns a Buffer", async () => {
    const buf = await createEventZip([])
    expect(buf).toBeInstanceOf(Buffer)
  })
})
