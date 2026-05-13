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

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]
  const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  try {
    const filename = await saveFile(file, qrCode.event.tenant.slug, qrCode.event.slug)
    await db.photo.create({ data: { qrCodeId: qrCode.id, filename } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
