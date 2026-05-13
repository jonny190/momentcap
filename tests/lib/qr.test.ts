import { describe, it, expect } from "vitest"
import { generateQRCodePNG } from "@/lib/qr"

describe("generateQRCodePNG", () => {
  it("returns a Buffer containing PNG data for a URL", async () => {
    const buf = await generateQRCodePNG("https://example.com/c/abc123")
    expect(buf).toBeInstanceOf(Buffer)
    // PNG magic bytes: 89 50 4E 47
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
  })
})
