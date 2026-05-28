// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { timingSafeEqual, createHmac } from "crypto"
import { db } from "./db"

function safeEqual(a: string, b: string): boolean {
  const key = process.env.AUTH_SECRET ?? "constant-fallback-key"
  const ha = createHmac("sha256", key).update(a).digest()
  const hb = createHmac("sha256", key).update(b).digest()
  return timingSafeEqual(ha, hb)
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email as string
        const password = credentials?.password as string
        if (!rawEmail || !password) return null
        const email = rawEmail.trim().toLowerCase()

        const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL ?? "").trim().toLowerCase()
        const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? ""
        if (adminEmail && safeEqual(email, adminEmail) && safeEqual(password, adminPassword)) {
          return { id: "platform_admin", email, role: "platform_admin" }
        }

        const tenant = await db.tenant.findFirst({ where: { email, enabled: true } })
        if (!tenant) {
          console.warn(`[auth] login failed: no enabled tenant for email "${email}"`)
          return null
        }

        const valid = await bcrypt.compare(password, tenant.passwordHash)
        if (!valid) {
          console.warn(`[auth] login failed: bad password for tenant "${email}"`)
          return null
        }

        return {
          id: tenant.id,
          email,
          role: "tenant_admin",
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as Record<string, unknown>
        token.role = u.role as "platform_admin" | "tenant_admin" | undefined
        token.tenantId = (u.tenantId as string | null | undefined) ?? null
        token.tenantSlug = (u.tenantSlug as string | null | undefined) ?? null
        token.impersonatingAs = null
        token.impersonatingSlug = null
      }
      if (trigger === "update" && session) {
        token.impersonatingAs = session.impersonatingAs ?? null
        token.impersonatingSlug = session.impersonatingSlug ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as "platform_admin" | "tenant_admin"
      session.user.tenantId = (token.tenantId as string) ?? null
      session.user.tenantSlug = (token.tenantSlug as string) ?? null
      session.user.impersonatingAs = (token.impersonatingAs as string) ?? null
      session.user.impersonatingSlug = (token.impersonatingSlug as string) ?? null
      return session
    },
  },
})
