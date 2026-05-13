import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import { join, extname } from "path"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params
  const session = await auth()
  const tenantId = getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const photo = await db.photo.findFirst({
    where: { id: photoId, qrCode: { event: { tenantId } } },
  })
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filePath = join(process.cwd(), "uploads", photo.filename)
  const buffer = await readFile(filePath)
  const ext = extname(photo.filename).slice(1) || "jpg"

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": `image/${ext}`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
