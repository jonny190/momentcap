/* eslint-disable @next/next/no-img-element */
export function PoweredByCoria({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <a
      href="https://coria.ai"
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-2 text-xs ${tone === "dark" ? "text-lilac/70 hover:text-lilac" : "text-ink/50 hover:text-ink/80"}`}
    >
      <span>Powered by</span>
      <span className={tone === "dark" ? "rounded bg-print px-1.5 py-0.5" : ""}>
        <img src="/coria-logo.png" alt="Coria" width={39} height={18} className="h-[18px] w-auto" />
      </span>
    </a>
  )
}
