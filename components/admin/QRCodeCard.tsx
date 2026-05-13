// components/admin/QRCodeCard.tsx
"use client"
import { Button } from "@/components/ui/Button"

interface QRCodeCardProps {
  qrCode: {
    id: string
    label: string | null
    token: string
    eventId: string
    _count: { photos: number }
  }
}

export function QRCodeCard({ qrCode }: QRCodeCardProps) {
  const label = qrCode.label ?? "Primary"
  const downloadUrl = `/api/admin/events/${qrCode.eventId}/qrcodes/${qrCode.id}/download`

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-gray-500 text-xs mt-1">
          {qrCode._count.photos} {qrCode._count.photos === 1 ? "photo" : "photos"}
        </p>
      </div>
      <a href={downloadUrl} download>
        <Button variant="secondary" className="text-xs py-1.5">Download PNG</Button>
      </a>
    </div>
  )
}
