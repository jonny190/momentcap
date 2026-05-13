// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: "platform_admin" | "tenant_admin"
      tenantId: string | null
      tenantSlug: string | null
      impersonatingAs: string | null
      impersonatingSlug: string | null
    } & DefaultSession["user"]
  }
}
