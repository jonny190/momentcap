import { createHash, createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const SESSION_COOKIE = "mc_admin"
const SESSION_DAYS = 14

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // Falling back to a value derived from the password means changing the
  // password also signs everyone out.
  return createHash("sha256").update(`momentcap:${process.env.ADMIN_PASSWORD ?? ""}`).digest("hex")
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url")
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest()
  const hb = createHmac("sha256", "cmp").update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(password, expected)
}

export function createSessionValue(now = Date.now()): { value: string; expires: Date } {
  const expires = new Date(now + SESSION_DAYS * 24 * 60 * 60 * 1000)
  const payload = String(expires.getTime())
  return { value: `${payload}.${sign(payload)}`, expires }
}

export function verifySessionValue(value: string | undefined, now = Date.now()): boolean {
  if (!value || !adminConfigured()) return false
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return false
  if (!safeEqual(signature, sign(payload))) return false
  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && expiresAt > now
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return verifySessionValue(store.get(SESSION_COOKIE)?.value)
}

export async function startSession() {
  const { value, expires } = createSessionValue()
  const store = await cookies()
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  })
}

export async function endSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
