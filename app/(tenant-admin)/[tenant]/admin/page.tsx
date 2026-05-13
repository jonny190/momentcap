// app/(tenant-admin)/[tenant]/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { EventCard } from "@/components/admin/EventCard"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function TenantDashboard({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const session = await auth()

  const isAuthorised =
    (session?.user.role === "tenant_admin" && session.user.tenantSlug === tenant) ||
    (session?.user.role === "platform_admin" && session.user.impersonatingSlug === tenant)

  if (!isAuthorised) redirect(`/${tenant}/admin/login`)

  const tenantId = session!.user.impersonatingAs ?? session!.user.tenantId!
  const tenantRecord = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenantRecord) redirect(`/${tenant}/admin/login`)

  const events = await db.event.findMany({
    where: { tenantId },
    include: { _count: { select: { qrCodes: true } } },
    orderBy: { createdAt: "desc" },
  })

  const eventsWithPhotos = await Promise.all(
    events.map(async (event) => ({
      ...event,
      photoCount: await db.photo.count({ where: { qrCode: { eventId: event.id } } }),
    }))
  )

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{tenantRecord.name}</h1>
          <p className="text-gray-500 text-sm">Events</p>
        </div>
        <Link href={`/${tenant}/admin/events/new`}>
          <Button>+ New Event</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {eventsWithPhotos.map((event) => (
          <EventCard key={event.id} event={event} tenantSlug={tenant} />
        ))}
        {eventsWithPhotos.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No events yet.</p>
        )}
      </div>
    </div>
  )
}
