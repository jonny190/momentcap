import { jsonError } from "@/modules/core/http"
import { getMedia } from "@/modules/media/repo"
import { deleteMedia } from "@/modules/media/service"
import { guestEvent } from "@/modules/uploads/http"
import { cleanDeviceId } from "@/modules/uploads/service"

/** Guests can remove their own photos and videos, nobody else's. */
export async function DELETE(req: Request, ctx: { params: Promise<{ token: string; mediaId: string }> }) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  const { mediaId } = await ctx.params
  const device = cleanDeviceId(req.headers.get("x-device-id"))
  const m = getMedia(mediaId)
  if (!m || !device || m.deviceId !== device) return jsonError(404, "Not found")
  await deleteMedia(mediaId)
  return new Response(null, { status: 204 })
}
