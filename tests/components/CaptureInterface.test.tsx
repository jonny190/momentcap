import { render, screen, fireEvent, act } from "@testing-library/react"
import { CaptureInterface } from "@/components/capture/CaptureInterface"
import { vi } from "vitest"

global.fetch = vi.fn().mockResolvedValue({ ok: true })

describe("CaptureInterface", () => {
  it("renders a hidden file input with camera capture", () => {
    render(<CaptureInterface token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.accept).toBe("image/*")
    expect(input.getAttribute("capture")).toBe("environment")
  })

  it("shows uploading state during upload", async () => {
    let resolveUpload!: () => void
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveUpload = () => resolve({ ok: true }) })
    )
    render(<CaptureInterface token="test-token" />)
    // simulate file selection
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    Object.defineProperty(input, "files", { value: [file] })
    await act(async () => {
      fireEvent.change(input)
    })
    expect(await screen.findByText(/uploading/i)).toBeInTheDocument()
    resolveUpload()
  })
})
