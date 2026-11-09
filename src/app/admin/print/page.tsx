import { requireAdminPage } from "@/modules/admin/guard"
import { PrintButton } from "@/modules/admin/PrintButton"
import { guestUrl } from "@/modules/core/public-url"
import { qrSvg } from "@/modules/event/qr"
import { getEvent } from "@/modules/event/repo"

export const metadata = { title: "Print a sign | MomentCap" }

/** An A5 table sign. Print it from the browser, or save as PDF. */
export default async function PrintSign() {
  await requireAdminPage()
  const event = getEvent()
  const svg = await qrSvg(await guestUrl(event.guestToken))

  return (
    <div className="min-h-dvh bg-mist py-8 print:bg-white print:py-0">
      <style>{`@page { size: A5 portrait; margin: 0 }`}</style>
      <div className="mx-auto mb-6 flex max-w-[148mm] items-center justify-between px-4 print:hidden">
        <a href="/admin" className="text-sm text-ink/60 hover:text-ink">Back to overview</a>
        <PrintButton />
      </div>
      <article className="mx-auto flex h-[210mm] w-[148mm] flex-col items-center justify-between bg-white px-[14mm] py-[16mm] text-center text-ink shadow-sm ring-1 ring-line print:shadow-none print:ring-0">
        <div>
          <h1 className="font-display text-[34pt] leading-[1.05] text-balance">{event.name}</h1>
          <p className="mt-[6mm] text-[13pt] leading-snug">Scan with your phone camera to add your photos and videos to our album.</p>
        </div>
        <div className="w-[78mm] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-[11pt] text-ink/70">No app and no sign up. Just point, shoot and it is shared.</p>
      </article>
    </div>
  )
}
