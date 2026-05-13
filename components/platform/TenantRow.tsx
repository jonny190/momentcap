// components/platform/TenantRow.tsx
"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface TenantRowProps {
  tenant: {
    id: string
    name: string
    slug: string
    email: string
    enabled: boolean
    _count: { events: number }
    photoCount: number
  }
}

export function TenantRow({ tenant }: TenantRowProps) {
  const router = useRouter()

  async function handleImpersonate() {
    const res = await fetch(`/api/platform/tenants/${tenant.id}/impersonate`, {
      method: "POST",
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/${data.tenantSlug}/admin`)
    }
  }

  async function handleToggleEnabled() {
    const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tenant.enabled }),
    })
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{tenant.name}</p>
        <p className="text-gray-500 text-xs mt-1">
          <code className="text-gray-400">/{tenant.slug}/admin</code> ·{" "}
          {tenant._count.events} events · {tenant.photoCount} photos ·{" "}
          <span className={tenant.enabled ? "text-green-400" : "text-gray-600"}>
            {tenant.enabled ? "Active" : "Disabled"}
          </span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {tenant.enabled && (
          <Button
            variant="secondary"
            className="text-xs py-1.5 text-yellow-400 border-yellow-800"
            onClick={handleImpersonate}
          >
            Impersonate
          </Button>
        )}
        <Button
          variant={tenant.enabled ? "danger" : "secondary"}
          className="text-xs py-1.5"
          onClick={handleToggleEnabled}
        >
          {tenant.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  )
}
