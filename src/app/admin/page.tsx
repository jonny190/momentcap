import Link from "next/link"
import { requireAdminPage } from "@/modules/admin/guard"
import { AdminShell } from "@/modules/admin/AdminShell"
import { SettingsForm } from "@/modules/admin/SettingsForm"
import { CopyLink, NewLinkButton } from "@/modules/admin/GuestLinkTools"
import { formatBytes, plural } from "@/modules/core/format"
import { guestUrl } from "@/modules/core/public-url"
import { qrSvg } from "@/modules/event/qr"
import { getEvent } from "@/modules/event/repo"
import { mediaStats } from "@/modules/media/repo"
import { freeBytes } from "@/modules/media/storage"

export const metadata = { title: "Overview | MomentCap" }

export default async function AdminOverview() {
  await requireAdminPage()
  const event = getEvent()
  const stats = mediaStats()
  const free = await freeBytes()
  const url = await guestUrl(event.guestToken)
  const svg = await qrSvg(url)

  return (
    <AdminShell eventName={event.name} active="/admin">
      <section className="mb-8">
        <p className="max-w-3xl text-2xl leading-snug text-balance">
          {stats.photos + stats.videos === 0 ? (
            <>No shots yet. Put the QR code out and they will start arriving here.</>
          ) : (
            <>
              {plural(stats.photos, "photo")} and {plural(stats.videos, "video")} from {plural(stats.guests, "guest")}.
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Using {formatBytes(stats.bytes)} with {formatBytes(free)} free on the server.
          {stats.processing > 0 && ` ${plural(stats.processing, "item")} still being prepared.`}
          {stats.hidden > 0 && ` ${plural(stats.hidden, "item")} hidden from guests.`}
          {!event.uploadsOpen && " New uploads are switched off."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/album" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">
            Open the album
          </Link>
          {stats.photos + stats.videos > 0 && (
            <a href="/api/admin/download" className="rounded-full bg-white px-5 py-2 text-sm font-semibold ring-1 ring-line hover:ring-ink/30">
              Download everything (ZIP)
            </a>
          )}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
          <h2 className="font-semibold">Guest QR code</h2>
          <p className="mt-1 text-sm text-ink/60">Guests scan this to open the camera. Anyone with the link can add to the album.</p>
          <div className="mx-auto mt-4 w-56 max-w-full [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="mt-4">
            <CopyLink url={url} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <a href="/api/admin/qr?format=png" className="rounded-full bg-white px-3.5 py-2 ring-1 ring-line hover:ring-ink/30">Download PNG</a>
            <a href="/api/admin/qr?format=svg" className="rounded-full bg-white px-3.5 py-2 ring-1 ring-line hover:ring-ink/30">Download SVG</a>
            <Link href="/admin/print" className="rounded-full bg-white px-3.5 py-2 ring-1 ring-line hover:ring-ink/30">Print a sign</Link>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <NewLinkButton />
            <p className="mt-1 text-xs text-ink/50">Use this if the link has been shared somewhere it should not have been.</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
          <h2 className="mb-4 font-semibold">Event settings</h2>
          <SettingsForm name={event.name} welcomeMessage={event.welcomeMessage} uploadsOpen={event.uploadsOpen} galleryOpen={event.galleryOpen} />
        </section>
      </div>
    </AdminShell>
  )
}
