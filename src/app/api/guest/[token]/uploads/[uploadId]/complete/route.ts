import { NextResponse } from "next/server"
import { guestEvent, uploadErrorResponse } from "@/modules/uploads/http"
import { completeUpload } from "@/modules/uploads/service"

export async function POST(_req: Request, ctx: { params: Promise<{ token: string; uploadId: string }> }) {
  const event = await guestEvent(ctx.params)
  if (event instanceof Response) return event
  const { uploadId } = await ctx.params
  try {
    return NextResponse.json(await completeUpload(uploadId), { status: 201 })
  } catch (err) {
    return uploadErrorResponse(err)
  }
}
