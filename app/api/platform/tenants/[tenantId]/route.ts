// app/api/platform/tenants/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (typeof body.enabled === "boolean") updateData.enabled = body.enabled
  if (body.name) updateData.name = body.name.trim()
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12)

  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data: updateData,
  })

  return NextResponse.json({ ...tenant, passwordHash: undefined })
}
