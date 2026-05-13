import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { saveFile } from "@/lib/upload"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const qrCode = await db.qRCode.findUnique({
    where: { token },
    include: { event: { include: { tenant: true } } },
  })

  if (!qrCode || !qrCode.event.active || !qrCode.event.tenant.enabled) {
    return NextResponse.json({ error: "Invalid or inactive event" }, { status: 404 })
  }

  const form = await req.formData()
  const file = form.get("photo") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const filename = await saveFile(file, qrCode.event.tenant.slug, qrCode.event.slug)

  await db.photo.create({ data: { qrCodeId: qrCode.id, filename } })

  return NextResponse.json({ ok: true })
}
