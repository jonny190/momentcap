import { NextResponse } from "next/server"
import { jsonError } from "@/modules/core/http"
import { eventForToken, type EventSettings } from "@/modules/event/repo"
import { UploadError } from "./service"

export type GuestContext = { params: Promise<{ token: string }> }

/** Resolves the guest link or returns a 404 response. */
export async function guestEvent(params: Promise<{ token: string }>): Promise<EventSettings | Response> {
  const { token } = await params
  return eventForToken(token) ?? jsonError(404, "This event link is not valid")
}

export function uploadErrorResponse(err: unknown): Response {
  if (err instanceof UploadError) return jsonError(err.status, err.message, err.extra)
  console.error("[upload]", err)
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
}
