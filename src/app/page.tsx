import Link from "next/link"
import { connection } from "next/server"
import { getEvent } from "@/modules/event/repo"

export default async function Home() {
  await connection()
  const event = getEvent()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-night px-6 py-10 text-print">
      <div className="pt-16">
        <h1 className="font-display text-[2.6rem] leading-[1.02] text-balance">{event.name}</h1>
        <p className="mt-4 max-w-[32ch] leading-relaxed text-lilac">
          To add your photos and videos, scan the QR code you will find around the venue. It opens the camera
          straight away, with no app and no sign up.
        </p>
      </div>
      <div className="flex justify-end">
        <Link href="/admin" className="text-xs text-lilac/70 hover:text-lilac">
          Organiser sign in
        </Link>
      </div>
    </main>
  )
}
