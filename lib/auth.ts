// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"

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
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null

        if (
          email === process.env.PLATFORM_ADMIN_EMAIL &&
          password === process.env.PLATFORM_ADMIN_PASSWORD
        ) {
          return { id: "platform_admin", email, role: "platform_admin" }
        }

        const tenant = await db.tenant.findFirst({ where: { email, enabled: true } })
        if (!tenant) return null

        const valid = await bcrypt.compare(password, tenant.passwordHash)
        if (!valid) return null

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
        token.role = u.role
        token.tenantId = u.tenantId ?? null
        token.tenantSlug = u.tenantSlug ?? null
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
