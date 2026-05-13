// lib/session.ts
import type { Session } from "next-auth"

export function getTenantId(
  session: Session | null
): string | null {
  if (!session) return null
  if (session.user.impersonatingAs) return session.user.impersonatingAs
  if (session.user.role === "tenant_admin") return session.user.tenantId
  return null
}
