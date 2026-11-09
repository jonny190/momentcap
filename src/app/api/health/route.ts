import { db } from "@/modules/core/db"

export function GET() {
  db().prepare("SELECT 1").get()
  return Response.json({ ok: true })
}
