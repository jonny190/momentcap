import { NextRequest, NextResponse } from "next/server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.impersonatingAs) {
    await db.auditLog.create({
      data: {
        tenantId: session.user.impersonatingAs,
        action: "impersonate_end",
        metadata: JSON.stringify({
          adminEmail: session.user.email,
          endedAt: new Date().toISOString(),
        }),
      },
    })
    await unstable_update({ user: { impersonatingAs: null, impersonatingSlug: null } })
  }

  return NextResponse.json({ ok: true })
}
