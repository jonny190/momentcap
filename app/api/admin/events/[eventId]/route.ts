// app/api/admin/events/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await db.event.findFirst({ where: { id: eventId, tenantId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { active } = await req.json()
  const updated = await db.event.update({
    where: { id: eventId },
    data: { active },
  })
  return NextResponse.json(updated)
}
