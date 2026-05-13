// app/(tenant-admin)/[tenant]/admin/events/[eventId]/qrcodes/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewQRCode() {
  const router = useRouter()
  const params = useParams<{ tenant: string; eventId: string }>()
  const [label, setLabel] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const res = await fetch(`/api/admin/events/${params.eventId}/qrcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    })
    if (!res.ok) {
      setError("Failed to create QR code")
      return
    }
    router.push(`/${params.tenant}/admin/events/${params.eventId}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">Add QR Code</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">
            Label (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Ceremony, Reception (leave blank for primary)"
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit">Create QR Code</Button>
      </form>
    </div>
  )
}
