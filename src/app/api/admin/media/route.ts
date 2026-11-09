import { NextResponse } from "next/server"
import { isAdmin } from "@/modules/auth/session"
import { jsonError } from "@/modules/core/http"
import { listMedia } from "@/modules/media/repo"
import { toPublic, type MediaKind } from "@/modules/media/types"

export async function GET(req: Request) {
  if (!(await isAdmin())) return jsonError(401, "Sign in required")
  const q = new URL(req.url).searchParams
  const filter = q.get("filter")
  const { items, nextCursor } = listMedia({
    audience: "admin",
    kind: filter === "photo" || filter === "video" ? (filter as MediaKind) : undefined,
    hiddenOnly: filter === "hidden",
    before: q.get("before"),
    after: q.get("after"),
    limit: Number(q.get("limit")) || 60,
  })
  return NextResponse.json({ items: items.map((m) => toPublic(m)), nextCursor }, { headers: { "Cache-Control": "no-store" } })
}
