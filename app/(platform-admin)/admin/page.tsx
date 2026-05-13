// app/(platform-admin)/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { TenantRow } from "@/components/platform/TenantRow"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function PlatformAdmin() {
  const session = await auth()
  if (session?.user.role !== "platform_admin") redirect("/admin/login")

  const tenants = await db.tenant.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: { createdAt: "desc" },
  })

  const tenantsWithPhotos = await Promise.all(
    tenants.map(async (tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      enabled: tenant.enabled,
      _count: tenant._count,
      photoCount: await db.photo.count({
        where: { qrCode: { event: { tenantId: tenant.id } } },
      }),
    }))
  )

  const totalEvents = tenants.reduce((sum, t) => sum + t._count.events, 0)
  const totalPhotos = tenantsWithPhotos.reduce((sum, t) => sum + t.photoCount, 0)

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Platform Admin</h1>
        <p className="text-gray-500 text-sm">MomentCap</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Tenants", value: tenants.length },
          { label: "Events", value: totalEvents },
          { label: "Photos", value: totalPhotos },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-center"
          >
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tenants</h2>
        <Link href="/admin/tenants/new">
          <Button variant="secondary" className="text-xs py-1.5">+ New Tenant</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {tenantsWithPhotos.map((tenant) => (
          <TenantRow key={tenant.id} tenant={tenant} />
        ))}
        {tenants.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No tenants yet.</p>
        )}
      </div>
    </div>
  )
}
