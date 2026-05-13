import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"
import { createEventZip } from "@/lib/zip"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await db.event.findFirst({ where: { id: eventId, tenantId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const photos = await db.photo.findMany({
    where: { qrCode: { eventId } },
    select: { filename: true },
  })

  const zip = await createEventZip(photos)

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.slug}-photos.zip"`,
    },
  })
}
