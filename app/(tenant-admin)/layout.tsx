import { auth } from "@/lib/auth"
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner"

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <>
      {session?.user.role === "platform_admin" && session.user.impersonatingSlug && (
        <ImpersonationBanner tenantSlug={session.user.impersonatingSlug} />
      )}
      {children}
    </>
  )
}
