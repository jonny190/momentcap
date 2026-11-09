import { NextResponse } from "next/server"
import { clientIp, jsonError } from "@/modules/core/http"
import { rateLimit } from "@/modules/core/rate-limit"
import { guestEvent, uploadErrorResponse } from "@/modules/uploads/http"
import { cleanDeviceId, initUpload, type InitInput } from "@/modules/uploads/service"

/** Starts a resumable upload. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  if (!event.uploadsOpen) return jsonError(403, "Uploads are closed for this event")

  let input: InitInput
  try {
    input = await req.json()
  } catch {
    return jsonError(400, "Invalid request")
  }

  // Whole venues often share one IP, so the per-IP limit is generous and
  // the tighter limit is per device.
  const device = cleanDeviceId(input.deviceId) ?? "none"
  if (!rateLimit(`ip:${clientIp(req)}`, 1500, 10 * 60 * 1000) || !rateLimit(`dev:${device}`, 200, 10 * 60 * 1000)) {
    return jsonError(429, "Too many uploads, please wait a moment")
  }

  try {
    return NextResponse.json(await initUpload(input), { status: 201 })
  } catch (err) {
    return uploadErrorResponse(err)
  }
}
