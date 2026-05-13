// app/api/admin/events/[eventId]/qrcodes/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"
import { generateQRCodePNG } from "@/lib/qr"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  const { eventId, id } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const qrCode = await db.qRCode.findFirst({
    where: { id, eventId, event: { tenantId } },
  })
  if (!qrCode) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"
  const captureUrl = `${baseUrl}/c/${qrCode.token}`
  const png = await generateQRCodePNG(captureUrl)
  const label = qrCode.label ?? "primary"

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${label}.png"`,
    },
  })
}
