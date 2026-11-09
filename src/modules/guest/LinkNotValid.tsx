import { PoweredByCoria } from "@/components/PoweredByCoria"

export function LinkNotValid() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-night px-6 py-10 text-print">
      <div className="pt-16">
        <h1 className="font-display text-4xl leading-tight">This link has expired</h1>
        <p className="mt-4 max-w-[32ch] leading-relaxed text-lilac">
          The organiser has issued a new QR code. Scan one of the codes at the venue to carry on sharing.
        </p>
      </div>
      <PoweredByCoria />
    </main>
  )
}
