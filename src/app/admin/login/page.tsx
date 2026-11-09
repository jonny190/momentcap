import { redirect } from "next/navigation"
import { adminConfigured, isAdmin } from "@/modules/auth/session"
import { LoginForm } from "@/modules/admin/LoginForm"

export const metadata = { title: "Sign in | MomentCap" }

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin")
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-mist px-4 text-ink">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
        <h1 className="font-display text-3xl">MomentCap</h1>
        <p className="mt-1 text-sm text-ink/60">Sign in to manage your event.</p>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 text-sm text-red-700">Sign in is switched off. Set ADMIN_PASSWORD on the server to turn it on.</p>
        )}
      </div>
    </main>
  )
}
