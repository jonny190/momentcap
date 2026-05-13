// app/(platform-admin)/admin/tenants/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewTenant() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", slug: "", email: "", password: "" })
  const [error, setError] = useState("")

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const res = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Failed to create tenant")
      return
    }
    router.push("/admin")
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">New Tenant</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            required
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit">Create Tenant</Button>
      </form>
    </div>
  )
}
