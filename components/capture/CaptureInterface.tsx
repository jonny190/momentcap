"use client"
import { useRef, useState, useEffect } from "react"

type Status = "idle" | "uploading" | "done" | "error"

export function CaptureInterface({ token }: { token: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>("idle")

  const openCamera = () => inputRef.current?.click()

  useEffect(() => {
    openCamera()
  }, [])

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus("uploading")

    try {
      const body = new FormData()
      body.append("photo", file)
      const res = await fetch(`/api/upload/${token}`, { method: "POST", body })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    } finally {
      if (inputRef.current) inputRef.current.value = ""
      setTimeout(() => {
        setStatus("idle")
        openCamera()
      }, 1200)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {status === "idle" && (
        <button
          onClick={openCamera}
          className="flex flex-col items-center gap-3 text-white opacity-70 hover:opacity-100"
        >
          <span className="text-7xl">📷</span>
          <span className="text-sm">Tap to take a photo</span>
        </button>
      )}

      {status === "uploading" && (
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Uploading...</span>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-3 text-green-400">
          <span className="text-5xl">✓</span>
          <span className="text-sm">Photo saved!</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 text-red-400">
          <span className="text-sm">Upload failed - please try again</span>
          <button onClick={openCamera} className="text-white text-sm underline">
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
