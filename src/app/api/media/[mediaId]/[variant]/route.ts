import { serveMediaFile } from "@/modules/media/serve"
import { viewableMedia } from "@/modules/media/service"
import type { Variant } from "@/modules/media/types"

const VARIANTS: Variant[] = ["thumb", "display", "original"]

/** Serves a thumbnail, a web-sized copy, or the untouched original. */
export async function GET(req: Request, ctx: { params: Promise<{ mediaId: string; variant: string }> }) {
  const { mediaId, variant } = await ctx.params
  if (!VARIANTS.includes(variant as Variant)) return new Response("Not found", { status: 404 })
  const q = new URL(req.url).searchParams
  const m = await viewableMedia(mediaId, q.get("t"))
  if (!m) return new Response("Not found", { status: 404 })
  return serveMediaFile(req, m, variant as Variant, q.get("download") === "1")
}
