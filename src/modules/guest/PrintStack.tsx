"use client"

import type { QueueItem } from "./upload-queue"

const TILTS = [-4, 3, -2, 5, -5, 2]

/**
 * Recent shots shown as a small pile of prints. A print develops from grey
 * to full colour as it uploads, so progress needs no extra chrome.
 */
export function PrintStack({ items }: { items: QueueItem[] }) {
  const shown = items.slice(0, 5)

  if (shown.length === 0) {
    return (
      <div className="relative aspect-[4/5] h-full max-h-[340px]">
        <div className="absolute inset-0 rotate-[-3deg] rounded-[3px] border border-dashed border-night-3" />
        <div className="absolute inset-0 grid rotate-[2deg] place-items-center rounded-[3px] border border-dashed border-night-3 p-8 text-center text-sm text-lilac">
          Your shots land here, and in the shared album.
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/5] h-full max-h-[340px]">
      {shown
        .slice()
        .reverse()
        .map((item, i, arr) => {
          const top = i === arr.length - 1
          const developed = item.status === "done"
          return (
            <figure
              key={item.id}
              className="print-drop absolute inset-0 flex flex-col rounded-[3px] bg-print p-2.5 pb-9 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
              style={{ "--tilt": `${top ? 0 : TILTS[i % TILTS.length]}deg`, zIndex: i } as React.CSSProperties}
            >
              <div className="relative flex-1 overflow-hidden bg-night-3">
                {item.kind === "video" ? (
                  <video
                    src={`${item.previewUrl}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    className={`h-full w-full object-cover ${developed ? "print-developed" : "print-developing"}`}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className={`h-full w-full object-cover ${developed ? "print-developed" : "print-developing"}`}
                  />
                )}
                {item.kind === "video" && (
                  <span className="absolute left-2 top-2 rounded-full bg-night/70 px-2 py-0.5 text-[11px] text-print">Video</span>
                )}
              </div>
              {top && (
                <figcaption className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span
                      className={`block h-full rounded-full ${item.status === "failed" ? "bg-coral" : "bg-brass-deep"}`}
                      style={{ width: `${Math.round((item.status === "done" ? 1 : item.progress) * 100)}%` }}
                    />
                  </span>
                  <span className="text-[11px] font-medium text-ink/60">
                    {item.status === "done" ? "In the album" : item.status === "failed" ? "Not sent" : item.status === "waiting" ? "Waiting" : "Sending"}
                  </span>
                </figcaption>
              )}
            </figure>
          )
        })}
    </div>
  )
}
