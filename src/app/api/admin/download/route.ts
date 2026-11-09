import { isAdmin } from "@/modules/auth/session"
import { jsonError } from "@/modules/core/http"
import { getEvent } from "@/modules/event/repo"
import { allMediaForExport } from "@/modules/media/repo"
import { zipStream } from "@/modules/media/zip"

/** Streams every original as one ZIP. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return jsonError(401, "Sign in required")
  const slug = getEvent().name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"
  return new Response(zipStream(allMediaForExport(), req.signal), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-photos.zip"`,
      "Cache-Control": "no-store",
    },
  })
}
