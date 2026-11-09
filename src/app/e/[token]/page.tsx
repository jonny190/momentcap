import type { Metadata } from "next"
import { connection } from "next/server"
import { eventForToken } from "@/modules/event/repo"
import { CaptureScreen } from "@/modules/guest/CaptureScreen"
import { LinkNotValid } from "@/modules/guest/LinkNotValid"

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  await connection()
  const event = eventForToken((await params).token)
  return { title: event ? event.name : "MomentCap" }
}

export default async function CapturePage({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  const { token } = await params
  const event = eventForToken(token)
  if (!event) return <LinkNotValid />
  return (
    <CaptureScreen
      token={token}
      eventName={event.name}
      welcomeMessage={event.welcomeMessage}
      uploadsOpen={event.uploadsOpen}
      galleryOpen={event.galleryOpen}
    />
  )
}
