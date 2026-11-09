import { requireAdminPage } from "@/modules/admin/guard"
import { AdminShell } from "@/modules/admin/AdminShell"
import { getEvent } from "@/modules/event/repo"
import { Gallery } from "@/modules/media/ui/Gallery"

export const metadata = { title: "Album | MomentCap" }

export default async function AdminAlbum() {
  await requireAdminPage()
  const event = getEvent()
  return (
    <AdminShell eventName={event.name} active="/admin/album">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Album</h1>
          <p className="text-sm text-ink/60">Hide anything you would rather guests did not see. Hidden items still come with the ZIP download.</p>
        </div>
        <a href="/api/admin/download" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">
          Download everything (ZIP)
        </a>
      </div>
      <Gallery mode="admin" />
    </AdminShell>
  )
}
