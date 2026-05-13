// app/(tenant-admin)/[tenant]/admin/events/[eventId]/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { QRCodeCard } from "@/components/admin/QRCodeCard"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function EventDetail({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>
}) {
  const { tenant, eventId } = await params
  const session = await auth()
  const isAuthorised =
    (session?.user.role === "tenant_admin" && session.user.tenantSlug === tenant) ||
    (session?.user.role === "platform_admin" && session.user.impersonatingSlug === tenant)

  if (!isAuthorised) redirect(`/${tenant}/admin/login`)

  const tenantId = session!.user.impersonatingAs ?? session!.user.tenantId!
  const event = await db.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      qrCodes: {
        include: { _count: { select: { photos: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!event) redirect(`/${tenant}/admin`)

  const photoCount = await db.photo.count({ where: { qrCode: { eventId: event.id } } })

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${tenant}/admin`} className="text-gray-500 text-sm hover:text-white">
          &larr; Events
        </Link>
        <h1 className="text-xl font-bold mt-2">{event.name}</h1>
        <p className="text-gray-500 text-sm">{photoCount} photos</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">QR Codes</h2>
          <Link href={`/${tenant}/admin/events/${eventId}/qrcodes/new`}>
            <Button variant="secondary" className="text-xs py-1.5">+ Add Code</Button>
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {event.qrCodes.map((qr) => (
            <QRCodeCard key={qr.id} qrCode={qr} />
          ))}
          {event.qrCodes.length === 0 && (
            <p className="text-gray-600 text-sm py-4 text-center">No QR codes yet.</p>
          )}
        </div>
      </div>

      {photoCount > 0 && (
        <div className="flex gap-3">
          <Link href={`/${tenant}/admin/events/${eventId}/gallery`}>
            <Button variant="secondary">View Gallery</Button>
          </Link>
          <a href={`/api/admin/events/${eventId}/download`}>
            <Button>Download All (ZIP)</Button>
          </a>
        </div>
      )}
    </div>
  )
}
