import { isAdmin } from "@/modules/auth/session"
import { jsonError } from "@/modules/core/http"
import { guestUrl } from "@/modules/core/public-url"
import { qrPng, qrSvg } from "@/modules/event/qr"
import { getEvent } from "@/modules/event/repo"

export async function GET(req: Request) {
  if (!(await isAdmin())) return jsonError(401, "Sign in required")
  const url = await guestUrl(getEvent().guestToken)
  const format = new URL(req.url).searchParams.get("format")
  if (format === "svg") {
    return new Response(await qrSvg(url), {
      headers: { "Content-Type": "image/svg+xml", "Content-Disposition": 'attachment; filename="momentcap-qr.svg"' },
    })
  }
  return new Response(new Uint8Array(await qrPng(url)), {
    headers: { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="momentcap-qr.png"' },
  })
}
