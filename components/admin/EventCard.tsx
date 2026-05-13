// components/admin/EventCard.tsx
"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface EventCardProps {
  event: {
    id: string
    name: string
    active: boolean
    _count: { qrCodes: number }
    photoCount: number
  }
  tenantSlug: string
}

export function EventCard({ event, tenantSlug }: EventCardProps) {
  const router = useRouter()

  async function handleToggleActive() {
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !event.active }),
    })
    router.refresh()
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-white font-medium">{event.name}</p>
        <p className="text-gray-500 text-xs mt-1">
          {event._count.qrCodes} QR {event._count.qrCodes === 1 ? "code" : "codes"} ·{" "}
          {event.photoCount} {event.photoCount === 1 ? "photo" : "photos"} ·{" "}
          <span className={event.active ? "text-green-400" : "text-gray-500"}>
            {event.active ? "Active" : "Ended"}
          </span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/${tenantSlug}/admin/events/${event.id}`}>
          <Button variant="secondary" className="text-xs py-1.5">Manage</Button>
        </Link>
        <Button
          variant={event.active ? "danger" : "secondary"}
          className="text-xs py-1.5"
          onClick={handleToggleActive}
        >
          {event.active ? "End Event" : "Reopen"}
        </Button>
      </div>
    </div>
  )
}
