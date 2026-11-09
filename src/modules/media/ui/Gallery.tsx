"use client"
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react"
import type { PublicMedia, Variant } from "@/modules/media/types"
import { removeMedia, setMediaHidden } from "@/modules/admin/actions"
import { deviceId } from "@/modules/guest/identity"

type Props =
  | { mode: "guest"; token: string }
  | { mode: "admin" }

type Filter = "all" | "photo" | "video" | "hidden"

const POLL_MS = 20_000

export function Gallery(props: Props) {
  const admin = props.mode === "admin"
  const token = props.mode === "guest" ? props.token : null
  const [items, setItems] = useState<PublicMedia[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [open, setOpen] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const sentinel = useRef<HTMLDivElement>(null)

  const listUrl = useCallback(
    (params: Record<string, string>) => {
      const q = new URLSearchParams(params)
      if (admin && filter !== "all") q.set("filter", filter)
      return admin ? `/api/admin/media?${q}` : `/api/guest/${token}/media?${q}`
    },
    [admin, filter, token]
  )

  const fetchPage = useCallback(
    async (params: Record<string, string>) => {
      const res = await fetch(listUrl(params), {
        cache: "no-store",
        headers: admin ? {} : { "x-device-id": deviceId() },
      })
      if (!res.ok) throw new Error(res.status === 403 ? "The album is not being shared right now." : "The album could not be loaded.")
      return (await res.json()) as { items: PublicMedia[]; nextCursor: string | null }
    },
    [listUrl, admin]
  )

  // First page, and again whenever the filter changes.
  useEffect(() => {
    let cancelled = false
    fetchPage({})
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setCursor(page.nextCursor)
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [fetchPage])

  // New arrivals while the page is open.
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      const newest = items[0]?.createdAt
      if (!newest) return
      try {
        const page = await fetchPage({ after: newest, limit: "100" })
        if (page.items.length) {
          setItems((prev) => {
            const known = new Set(prev.map((p) => p.id))
            return [...page.items.filter((p) => !known.has(p.id)), ...prev]
          })
          setOpen((o) => (o === null ? o : o + page.items.length))
        }
      } catch {}
    }, POLL_MS)
    return () => clearInterval(t)
  }, [items, fetchPage])

  // Older pages as the guest scrolls.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !cursor) return
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || !cursor) return
      setCursor(null)
      try {
        const page = await fetchPage({ before: cursor })
        setItems((prev) => [...prev, ...page.items])
        setCursor(page.nextCursor)
      } catch {
        setCursor(cursor)
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [cursor, fetchPage])

  const fileUrl = (id: string, variant: Variant, download = false) => {
    const q = new URLSearchParams()
    if (token) q.set("t", token)
    if (download) q.set("download", "1")
    const qs = q.toString()
    return `/api/media/${id}/${variant}${qs ? `?${qs}` : ""}`
  }

  async function deleteOwn(id: string) {
    if (!confirm("Remove this from the album?")) return
    const res = await fetch(`/api/guest/${token}/media/${id}`, { method: "DELETE", headers: { "x-device-id": deviceId() } })
    if (res.ok) drop([id])
  }

  function drop(ids: string[]) {
    setItems((prev) => prev.filter((p) => !ids.includes(p.id)))
    setSelected(new Set())
    setOpen(null)
  }

  async function adminHide(ids: string[], hidden: boolean) {
    await setMediaHidden(ids, hidden)
    if (filter === "hidden" && !hidden) drop(ids)
    else setItems((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, hidden } : p)))
    setSelected(new Set())
  }

  async function adminDelete(ids: string[]) {
    if (!confirm(ids.length === 1 ? "Delete this for good? It cannot be undone." : `Delete ${ids.length} items for good? This cannot be undone.`)) return
    await removeMedia(ids)
    drop(ids)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const current = open !== null ? items[open] : null

  return (
    <div>
      {admin && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", "photo", "video", "hidden"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setLoading(true)
                setFilter(f)
                setSelected(new Set())
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm ${filter === f ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink/30"}`}
            >
              {{ all: "Everything", photo: "Photos", video: "Videos", hidden: "Hidden from guests" }[f]}
            </button>
          ))}
          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-ink/60">{selected.size} selected</span>
              <button onClick={() => adminHide([...selected], filter !== "hidden")} className="rounded-full bg-white px-3.5 py-1.5 ring-1 ring-line hover:ring-ink/30">
                {filter === "hidden" ? "Show to guests" : "Hide from guests"}
              </button>
              <button onClick={() => adminDelete([...selected])} className="rounded-full bg-white px-3.5 py-1.5 text-red-700 ring-1 ring-line hover:ring-red-300">
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className={admin ? "py-10 text-center text-ink/60" : "py-16 text-center text-lilac"}>{error}</p>}
      {!error && !loading && items.length === 0 && (
        <p className={admin ? "py-16 text-center text-ink/60" : "py-16 text-center text-lilac"}>
          {admin ? "Nothing here yet. Once guests start shooting, their photos and videos show up here." : "No shots yet. Be the first."}
        </p>
      )}

      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((m, i) => (
          <li key={m.id} className="relative aspect-square">
            <button
              onClick={() => setOpen(i)}
              className={`relative block h-full w-full overflow-hidden ${admin ? "bg-line" : "bg-night-2"}`}
              aria-label={`Open ${m.kind}${m.guestName ? ` by ${m.guestName}` : ""}`}
            >
              {m.hasThumb ? (
                <img src={fileUrl(m.id, "thumb")} alt="" loading="lazy" className={`h-full w-full object-cover ${m.hidden ? "opacity-40" : ""}`} />
              ) : (
                <span className="grid h-full w-full place-items-center text-xs opacity-60">{m.status === "processing" ? "Preparing" : m.kind === "video" ? "Video" : "Photo"}</span>
              )}
              {m.kind === "video" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                  {m.duration ? formatDuration(m.duration) : "Video"}
                </span>
              )}
              {m.hidden && <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">Hidden</span>}
            </button>
            {admin && (
              <label className="absolute left-1 top-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-white/90 shadow">
                <span className="sr-only">Select</span>
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-ink" />
              </label>
            )}
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="h-10" />

      {current && open !== null && (
        <Lightbox
          media={current}
          src={fileUrl(current.id, "display")}
          downloadHref={fileUrl(current.id, "original", true)}
          onClose={() => setOpen(null)}
          onPrev={open > 0 ? () => setOpen(open - 1) : undefined}
          onNext={open < items.length - 1 ? () => setOpen(open + 1) : undefined}
          actions={
            admin ? (
              <>
                <button onClick={() => adminHide([current.id], !current.hidden)} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
                  {current.hidden ? "Show to guests" : "Hide from guests"}
                </button>
                <button onClick={() => adminDelete([current.id])} className="rounded-full bg-white/10 px-4 py-2 text-coral hover:bg-white/20">
                  Delete
                </button>
              </>
            ) : current.mine ? (
              <button onClick={() => deleteOwn(current.id)} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
                Remove
              </button>
            ) : null
          }
        />
      )}
    </div>
  )
}

function Lightbox({
  media,
  src,
  downloadHref,
  onClose,
  onPrev,
  onNext,
  actions,
}: {
  media: PublicMedia
  src: string
  downloadHref: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  actions: React.ReactNode
}) {
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev?.()
      if (e.key === "ArrowRight") onNext?.()
    }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, onPrev, onNext])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex flex-col bg-[#120d17] text-white"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (dx > 60) onPrev?.()
        if (dx < -60) onNext?.()
        touchX.current = null
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{media.guestName ?? "A guest"}</p>
          <p className="text-white/60">{formatTime(media.createdAt)}</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {media.kind === "video" ? (
          <video key={media.id} src={src} controls playsInline autoPlay className="max-h-full max-w-full" />
        ) : (
          <img key={media.id} src={src} alt={media.guestName ? `Photo by ${media.guestName}` : "Photo"} className="max-h-full max-w-full object-contain" />
        )}
        {onPrev && (
          <button onClick={onPrev} className="absolute left-2 hidden rounded-full bg-black/40 px-3 py-2 sm:block" aria-label="Previous">
            ‹
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="absolute right-2 hidden rounded-full bg-black/40 px-3 py-2 sm:block" aria-label="Next">
            ›
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
        <a href={downloadHref} className="rounded-full bg-white px-4 py-2 font-semibold text-night">
          Download
        </a>
        {actions}
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`
}
