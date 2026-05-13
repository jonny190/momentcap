import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PhotoGrid } from "@/components/admin/PhotoGrid"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function GalleryPage({
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
  const event = await db.event.findFirst({ where: { id: eventId, tenantId } })
  if (!event) redirect(`/${tenant}/admin`)

  const photos = await db.photo.findMany({
    where: { qrCode: { eventId } },
    include: { qrCode: { select: { label: true } } },
    orderBy: { uploadedAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/${tenant}/admin/events/${eventId}`}
            className="text-gray-500 text-sm hover:text-white"
          >
            &larr; {event.name}
          </Link>
          <h1 className="text-xl font-bold mt-1">Gallery</h1>
          <p className="text-gray-500 text-sm">{photos.length} photos</p>
        </div>
        <a href={`/api/admin/events/${eventId}/download`}>
          <Button>Download All (ZIP)</Button>
        </a>
      </div>
      <PhotoGrid photos={photos} />
    </div>
  )
}
