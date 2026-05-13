"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export function ImpersonationBanner({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter()

  async function handleExit() {
    await fetch("/api/platform/tenants/impersonate", { method: "DELETE" })
    router.push("/admin")
  }

  return (
    <div className="w-full bg-yellow-950 border-b border-yellow-800 px-4 py-2 flex items-center justify-between gap-4">
      <p className="text-yellow-300 text-sm">
        <strong>Impersonating:</strong> {tenantSlug} - you are acting as this tenant&apos;s admin
      </p>
      <Button
        variant="secondary"
        className="text-xs py-1 border-yellow-700 text-yellow-300 shrink-0"
        onClick={handleExit}
      >
        Exit Impersonation
      </Button>
    </div>
  )
}
