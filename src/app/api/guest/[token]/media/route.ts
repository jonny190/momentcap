import { NextResponse } from "next/server"
import { jsonError } from "@/modules/core/http"
import { listMedia } from "@/modules/media/repo"
import { toPublic } from "@/modules/media/types"
import { guestEvent } from "@/modules/uploads/http"
import { cleanDeviceId } from "@/modules/uploads/service"

/** The shared album, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  if (!event.galleryOpen) return jsonError(403, "The album is not shared")

  const q = new URL(req.url).searchParams
  const device = cleanDeviceId(req.headers.get("x-device-id"))
  const { items, nextCursor } = listMedia({
    audience: "guest",
    before: q.get("before"),
    after: q.get("after"),
    limit: Number(q.get("limit")) || 60,
  })
  return NextResponse.json(
    { items: items.map((m) => toPublic(m, device)), nextCursor },
    { headers: { "Cache-Control": "no-store" } }
  )
}
