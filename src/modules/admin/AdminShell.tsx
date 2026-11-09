import Link from "next/link"
import { logout } from "./actions"

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/album", label: "Album" },
  { href: "/admin/print", label: "Print a sign" },
]

export function AdminShell({ eventName, active, children }: { eventName: string; active: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mist text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <p className="font-display text-xl">{eventName}</p>
          <nav className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active === n.href ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${active === n.href ? "bg-ink text-white" : "hover:bg-mist"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="ml-auto">
            <button className="text-sm text-ink/60 hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-12">{children}</main>
    </div>
  )
}
