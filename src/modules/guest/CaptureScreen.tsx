"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { PoweredByCoria } from "@/components/PoweredByCoria"
import { savedName, saveName } from "./identity"
import { PrintStack } from "./PrintStack"
import { UploadQueue, type QueueItem } from "./upload-queue"

type Props = {
  token: string
  eventName: string
  welcomeMessage: string
  uploadsOpen: boolean
  galleryOpen: boolean
}

export function CaptureScreen({ token, eventName, welcomeMessage, uploadsOpen, galleryOpen }: Props) {
  const queue = useMemo(() => new UploadQueue(token), [token])
  const [items, setItems] = useState<QueueItem[]>([])
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Reading localStorage after mount keeps the server and client render identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(savedName())
    const unsubscribe = queue.subscribe(setItems)
    void queue.restore()
    const wake = () => queue.nudge()
    const onVisible = () => document.visibilityState === "visible" && queue.nudge()
    const warn = (e: BeforeUnloadEvent) => {
      if (queue.pendingCount > 0) e.preventDefault()
    }
    window.addEventListener("online", wake)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("beforeunload", warn)
    return () => {
      unsubscribe()
      window.removeEventListener("online", wake)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("beforeunload", warn)
    }
  }, [queue])

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length) queue.add(files, name)
  }

  const pending = items.filter((i) => i.status === "waiting" || i.status === "uploading").length
  const failed = items.filter((i) => i.status === "failed")
  const latestDone = items.find((i) => i.status === "done")

  return (
    <main className="mx-auto flex h-dvh min-h-[540px] max-w-md flex-col bg-night px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-print">
      <header className="shrink-0">
        <h1 className="font-display text-[clamp(2rem,9vw,2.6rem)] leading-[1.02] tracking-[-0.01em] text-balance">{eventName}</h1>
        {welcomeMessage && <p className="mt-2 line-clamp-3 max-w-[34ch] text-[0.95rem] leading-snug text-lilac">{welcomeMessage}</p>}
      </header>

      <section aria-live="polite" className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        {uploadsOpen ? (
          <PrintStack items={items} />
        ) : (
          <p className="max-w-[28ch] text-center text-lilac">
            This album has stopped taking new photos.{galleryOpen ? " You can still look through everything that was shared." : ""}
          </p>
        )}
      </section>

      <div className="min-h-5 shrink-0 text-center text-sm" aria-live="polite">
        {pending > 0 && <p className="text-lilac">Sending {pending === 1 ? "1 shot" : `${pending} shots`}. You can keep shooting.</p>}
        {pending === 0 && latestDone && <p className="text-brass">Saved to the album.</p>}
        {failed[0] && <p className="text-coral">{failed[0].error ?? "That one could not be sent."}</p>}
      </div>

      {uploadsOpen && (
        <div className="mt-1 flex shrink-0 justify-center">
          {editingName ? (
            <form
              className="flex w-full max-w-xs items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                saveName(name)
                setEditingName(false)
              }}
            >
              <label htmlFor="guest-name" className="sr-only">Your name</label>
              <input
                id="guest-name"
                autoFocus
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="given-name"
                className="min-w-0 flex-1 rounded-full border border-night-3 bg-night-2 px-4 py-2 text-base text-print placeholder:text-lilac/60"
              />
              <button className="rounded-full bg-print px-4 py-2 text-sm font-semibold text-night">Save</button>
            </form>
          ) : (
            <button onClick={() => setEditingName(true)} className="rounded-full px-3 py-1.5 text-sm text-lilac hover:text-print">
              {name ? `Shooting as ${name}. Change` : "Add your name to your shots"}
            </button>
          )}
        </div>
      )}

      <nav className="mt-2 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center" aria-label="Capture">
        <div className="flex justify-start">
          {uploadsOpen && (
            <RoundButton label="Video" onClick={() => videoInput.current?.click()}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="6" width="13" height="12" rx="2.5" />
                <path d="M16 10.5 21 7.5v9l-5-3" strokeLinejoin="round" />
              </svg>
            </RoundButton>
          )}
        </div>

        {uploadsOpen ? (
          <button
            onClick={() => photoInput.current?.click()}
            className="group flex flex-col items-center gap-2"
          >
            <span className="grid h-[84px] w-[84px] place-items-center rounded-full border-[3px] border-brass p-[5px] transition-transform group-active:scale-95">
              <span className="h-full w-full rounded-full bg-brass" />
            </span>
            <span className="text-sm font-semibold">Take a photo</span>
          </button>
        ) : (
          <span />
        )}

        <div className="flex justify-end">
          {galleryOpen && (
            <Link href={`/e/${token}/album`} className="flex flex-col items-center gap-2 text-sm">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-night-3 bg-night-2">
                {latestDone && latestDone.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={latestDone.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                  </svg>
                )}
              </span>
              <span>Album</span>
            </Link>
          )}
        </div>
      </nav>

      {uploadsOpen && (
        <button
          onClick={() => libraryInput.current?.click()}
          className="mx-auto mt-3 shrink-0 text-sm text-lilac underline decoration-night-3 underline-offset-4 hover:text-print"
        >
          Add photos you already took
        </button>
      )}

      <footer className="mt-3 flex shrink-0 justify-center">
        <PoweredByCoria />
      </footer>

      <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
      <input ref={videoInput} type="file" accept="video/*" capture="environment" hidden onChange={onFiles} />
      <input ref={libraryInput} type="file" accept="image/*,video/*" multiple hidden onChange={onFiles} />
    </main>
  )
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 text-sm">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-night-3 bg-night-2 transition-transform active:scale-95">
        {children}
      </span>
      <span>{label}</span>
    </button>
  )
}
