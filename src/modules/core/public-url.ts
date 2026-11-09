import { headers } from "next/headers"

/**
 * The address guests should be sent to. PUBLIC_URL wins. Otherwise it is
 * worked out from the request, trusting Cloudflare's scheme header because
 * the tunnel talks plain HTTP to the container.
 */
export async function publicBaseUrl(): Promise<string> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  let scheme = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http"
  try {
    const visitor = JSON.parse(h.get("cf-visitor") ?? "{}") as { scheme?: string }
    if (visitor.scheme) scheme = visitor.scheme
  } catch {}
  return `${scheme}://${host}`
}

export async function guestUrl(token: string) {
  return `${await publicBaseUrl()}/e/${token}`
}
