// app/api/admin/events/[eventId]/qrcodes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

async function assertEventOwnership(eventId: string, tenantId: string) {
  return db.event.findFirst({ where: { id: eventId, tenantId } })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await assertEventOwnership(eventId, tenantId)
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const qrCodes = await db.qRCode.findMany({
    where: { eventId },
    include: { _count: { select: { photos: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(qrCodes)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await assertEventOwnership(eventId, tenantId)
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { label } = await req.json()

  const qrCode = await db.qRCode.create({
    data: { eventId, label: label?.trim() || null },
  })

  return NextResponse.json(qrCode, { status: 201 })
}
