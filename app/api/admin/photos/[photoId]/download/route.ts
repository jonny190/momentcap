import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import { join, extname, resolve } from "path"

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

  const base = resolve(process.cwd(), "uploads")
  const filePath = resolve(base, photo.filename)
  if (!filePath.startsWith(base + "/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const buffer = await readFile(filePath)
  const MIME_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
  }
  const ext = extname(photo.filename).slice(1).toLowerCase()
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream"
  const name = photo.filename.split("/").pop()!

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  })
}
