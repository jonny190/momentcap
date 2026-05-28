import Link from "next/link"

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black px-6 text-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-green-500">
            Event photo capture
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            MomentCap
          </h1>
        </div>

        <p className="max-w-md text-lg leading-8 text-gray-400">
          Capture every moment at your event. Guests scan a QR code, their camera
          opens instantly, and every photo lands in your gallery. No app, no
          login, no friction.
        </p>

        <Link
          href="/admin"
          className="rounded-lg bg-green-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800"
        >
          Admin login →
        </Link>
      </div>
    </main>
  )
}
