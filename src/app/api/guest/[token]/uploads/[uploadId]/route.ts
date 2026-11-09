import { NextResponse } from "next/server"
import { jsonError } from "@/modules/core/http"
import { guestEvent, uploadErrorResponse } from "@/modules/uploads/http"
import { appendChunk, discardUpload, uploadStatus } from "@/modules/uploads/service"

type Ctx = { params: Promise<{ token: string; uploadId: string }> }

/** How many bytes the server already has, for resuming. */
export async function GET(_req: Request, ctx: Ctx) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  const { uploadId } = await ctx.params
  try {
    return NextResponse.json(await uploadStatus(uploadId))
  } catch (err) {
    return uploadErrorResponse(err)
  }
}

/** Appends a chunk. The body is raw bytes, the offset is a query param. */
export async function PUT(req: Request, ctx: Ctx) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  const { uploadId } = await ctx.params
  const offset = Number(new URL(req.url).searchParams.get("offset"))
  if (!Number.isInteger(offset) || offset < 0) return jsonError(400, "Invalid offset")
  try {
    return NextResponse.json(await appendChunk(uploadId, offset, req.body))
  } catch (err) {
    return uploadErrorResponse(err)
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  const { uploadId } = await ctx.params
  if (!/^[a-f0-9]{24}$/.test(uploadId)) return jsonError(404, "Upload not found")
  await discardUpload(uploadId)
  return new Response(null, { status: 204 })
}
