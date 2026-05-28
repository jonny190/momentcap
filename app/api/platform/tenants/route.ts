// app/api/platform/tenants/route.ts
import { NextRequest, NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

function assertPlatformAdmin(session: Session | null) {
  return session?.user.role === "platform_admin"
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!assertPlatformAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenants = await db.tenant.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: { createdAt: "desc" },
  })

  const tenantsWithPhotos = await Promise.all(
    tenants.map(async (tenant) => {
      const { passwordHash: _pw, ...safe } = tenant
      return {
        ...safe,
        photoCount: await db.photo.count({
          where: { qrCode: { event: { tenantId: tenant.id } } },
        }),
      }
    })
  )

  return NextResponse.json(tenantsWithPhotos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!assertPlatformAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, slug, email: rawEmail, password } = await req.json()

  if (!name || !slug || !rawEmail || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  }

  const email = (rawEmail as string).trim().toLowerCase()
  const normalizedSlug = (slug as string).toLowerCase()

  const existing = await db.tenant.findFirst({
    where: { OR: [{ slug: normalizedSlug }, { email }] },
  })
  if (existing) {
    return NextResponse.json({ error: "Slug or email already in use" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const tenant = await db.tenant.create({
    data: { name, slug: normalizedSlug, email, passwordHash },
  })

  const { passwordHash: _pw, ...safe } = tenant
  return NextResponse.json(safe, { status: 201 })
}
