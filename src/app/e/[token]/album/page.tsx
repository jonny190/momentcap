import Link from "next/link"
import { connection } from "next/server"
import { eventForToken } from "@/modules/event/repo"
import { LinkNotValid } from "@/modules/guest/LinkNotValid"
import { Gallery } from "@/modules/media/ui/Gallery"

export default async function GuestAlbum({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  const { token } = await params
  const event = eventForToken(token)
  if (!event) return <LinkNotValid />

  return (
    <main className="min-h-dvh bg-night text-print">
      <header className="sticky top-0 z-10 flex items-end justify-between gap-4 bg-night/95 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl">{event.name}</h1>
          <p className="text-sm text-lilac">Everyone&apos;s shots, newest first</p>
        </div>
        {event.uploadsOpen && (
          <Link href={`/e/${token}`} className="shrink-0 rounded-full bg-brass px-4 py-2 text-sm font-semibold text-night">
            Take a photo
          </Link>
        )}
      </header>
      <div className="px-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {event.galleryOpen ? (
          <Gallery mode="guest" token={token} />
        ) : (
          <p className="px-4 py-16 text-center text-lilac">The organiser is not sharing the album right now.</p>
        )}
      </div>
    </main>
  )
}
