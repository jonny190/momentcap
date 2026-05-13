// app/(tenant-admin)/[tenant]/admin/events/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewEvent() {
  const router = useRouter()
  const params = useParams<{ tenant: string }>()
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      setError("Failed to create event")
      return
    }
    router.push(`/${params.tenant}/admin`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">New Event</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          required
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit">Create Event</Button>
      </form>
    </div>
  )
}
