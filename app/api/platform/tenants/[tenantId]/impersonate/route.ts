import { NextRequest, NextResponse } from "next/server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant || !tenant.enabled) {
    return NextResponse.json({ error: "Tenant not found or disabled" }, { status: 404 })
  }

  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "impersonate_start",
      metadata: JSON.stringify({
        adminEmail: session.user.email,
        startedAt: new Date().toISOString(),
      }),
    },
  })

  await unstable_update({ user: { impersonatingAs: tenant.id, impersonatingSlug: tenant.slug } })

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug })
}
