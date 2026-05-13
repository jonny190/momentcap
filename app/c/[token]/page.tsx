import type { Metadata } from "next"
import { db } from "@/lib/db"
import { CaptureInterface } from "@/components/capture/CaptureInterface"

export const metadata: Metadata = {
  title: "MomentCap",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
  },
}

export default async function CapturePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const qrCode = await db.qRCode.findUnique({
    where: { token },
    include: { event: { include: { tenant: true } } },
  })

  if (!qrCode || !qrCode.event.active || !qrCode.event.tenant.enabled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 text-sm">This event has ended.</p>
      </div>
    )
  }

  return (
    <>
      <link rel="manifest" href="/manifest.json" />
      <CaptureInterface token={token} />
    </>
  )
}
