import { NextResponse } from "next/server"

export function clientIp(req: Request): string {
  const h = req.headers
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  )
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status })
}

export function newId(bytes = 12): string {
  return crypto.getRandomValues(new Uint8Array(bytes)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")
}
