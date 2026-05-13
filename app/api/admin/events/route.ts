// app/api/admin/events/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const events = await db.event.findMany({
    where: { tenantId },
    include: { _count: { select: { qrCodes: true } } },
    orderBy: { createdAt: "desc" },
  })

  const eventsWithPhotos = await Promise.all(
    events.map(async (event) => {
      const photoCount = await db.photo.count({
        where: { qrCode: { eventId: event.id } },
      })
      return { ...event, photoCount }
    })
  )

  return NextResponse.json(eventsWithPhotos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  try {
    const event = await db.event.create({
      data: { tenantId, name: name.trim(), slug },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "An event with this name already exists" }, { status: 409 })
    }
    throw e
  }
}
