import { render, screen, fireEvent, act } from "@testing-library/react"
import { CaptureInterface } from "@/components/capture/CaptureInterface"
import { vi, beforeEach } from "vitest"

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true })
})

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
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    Object.defineProperty(input, "files", { value: [file] })
    await act(async () => {
      fireEvent.change(input)
    })
    expect(await screen.findByText(/uploading/i)).toBeInTheDocument()
    resolveUpload()
  })

  it("does not upload when no file is selected (camera dismissed)", async () => {
    render(<CaptureInterface token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, "files", { value: [] })
    await act(async () => {
      fireEvent.change(input)
    })
    expect(global.fetch).not.toHaveBeenCalled()
    // idle state button should still be visible
    expect(screen.getByText(/tap to take a photo/i)).toBeInTheDocument()
  })
})
