"use client"

import { deviceId } from "./identity"
import { pendingStore, type PendingRecord } from "./pending-store"

export type QueueItem = {
  id: string
  kind: "photo" | "video"
  previewUrl: string
  progress: number
  status: "waiting" | "uploading" | "done" | "failed"
  error?: string
}

type Listener = (items: QueueItem[]) => void

class PermanentError extends Error {}
class RestartUpload extends Error {}

const MAX_SHOWN = 12

/**
 * Uploads files one at a time in resumable chunks and keeps retrying through
 * flaky connections. Guests never have to press anything again once they
 * have taken the shot.
 */
export class UploadQueue {
  private items: QueueItem[] = []
  private records = new Map<string, PendingRecord>()
  private listeners = new Set<Listener>()
  private running = false
  private wake: (() => void) | null = null

  constructor(private token: string) {}

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(this.items)
    return () => this.listeners.delete(fn)
  }

  get pendingCount() {
    return this.items.filter((i) => i.status === "waiting" || i.status === "uploading").length
  }

  /** Resumes anything left over from a previous visit. */
  async restore() {
    for (const r of await pendingStore.all(this.token)) {
      if (this.records.has(r.id)) continue
      this.track(r)
    }
    this.run()
  }

  add(files: File[], guestName: string) {
    for (const file of files) {
      const r: PendingRecord = {
        id: crypto.randomUUID(),
        token: this.token,
        file,
        name: file.name || "capture",
        type: file.type,
        size: file.size,
        guestName,
        uploadId: null,
        createdAt: Date.now(),
      }
      void pendingStore.put(r)
      this.track(r)
    }
    this.run()
  }

  /** Called when the connection comes back, to skip any backoff wait. */
  nudge() {
    this.wake?.()
  }

  private track(r: PendingRecord) {
    this.records.set(r.id, r)
    this.items = [
      {
        id: r.id,
        kind: r.type.startsWith("video") || /\.(mov|mp4|webm|3gp|m4v)$/i.test(r.name) ? "video" : "photo",
        previewUrl: URL.createObjectURL(r.file),
        progress: 0,
        status: "waiting" as const,
      },
      ...this.items,
    ]
    this.trim()
    this.emit()
  }

  private trim() {
    const keep: QueueItem[] = []
    let done = 0
    for (const item of this.items) {
      const finished = item.status === "done" || item.status === "failed"
      if (finished && ++done > MAX_SHOWN) {
        URL.revokeObjectURL(item.previewUrl)
        continue
      }
      keep.push(item)
    }
    this.items = keep
  }

  private update(id: string, patch: Partial<QueueItem>) {
    this.items = this.items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    this.emit()
  }

  private emit() {
    for (const fn of this.listeners) fn(this.items)
  }

  private async run() {
    if (this.running) return
    this.running = true
    try {
      for (;;) {
        const next = [...this.items].reverse().find((i) => i.status === "waiting")
        if (!next) break
        const record = this.records.get(next.id)
        if (!record) {
          this.update(next.id, { status: "failed", error: "Lost track of this file" })
          continue
        }
        await this.uploadWithRetry(record)
      }
    } finally {
      this.running = false
    }
  }

  private async uploadWithRetry(r: PendingRecord) {
    let delay = 1000
    for (;;) {
      try {
        this.update(r.id, { status: "uploading" })
        await this.upload(r)
        this.update(r.id, { status: "done", progress: 1 })
        this.records.delete(r.id)
        void pendingStore.remove(r.id)
        this.trim()
        return
      } catch (err) {
        if (err instanceof PermanentError) {
          this.update(r.id, { status: "failed", error: err.message })
          this.records.delete(r.id)
          void pendingStore.remove(r.id)
          return
        }
        if (err instanceof RestartUpload) {
          r.uploadId = null
          void pendingStore.put(r)
          continue
        }
        // Network trouble: wait, then try again. Going back online or
        // returning to the page cuts the wait short.
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, delay)
          this.wake = () => {
            clearTimeout(t)
            resolve()
          }
        })
        this.wake = null
        delay = Math.min(delay * 2, 30_000)
      }
    }
  }

  private base() {
    return `/api/guest/${encodeURIComponent(this.token)}/uploads`
  }

  private async upload(r: PendingRecord) {
    if (!r.uploadId) {
      const res = await fetch(this.base(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: r.name, type: r.type, size: r.size, guestName: r.guestName, deviceId: deviceId() }),
      })
      await this.check(res)
      r.uploadId = ((await res.json()) as { uploadId: string }).uploadId
      void pendingStore.put(r)
    }

    const url = `${this.base()}/${r.uploadId}`
    const status = await fetch(url, { cache: "no-store" })
    await this.check(status)
    let { received } = (await status.json()) as { received: number }
    const chunkSize = 8 * 1024 * 1024

    while (received < r.size) {
      const end = Math.min(received + chunkSize, r.size)
      const result = await putChunk(`${url}?offset=${received}`, r.file.slice(received, end), (sent) =>
        this.update(r.id, { progress: (received + sent) / r.size })
      )
      if (result.status === 409 && typeof result.body.received === "number") {
        received = result.body.received
        continue
      }
      if (result.status === 404) throw new RestartUpload()
      if (result.status >= 400 && result.status < 500) throw new PermanentError(String(result.body.error ?? "Upload refused"))
      if (result.status !== 200) throw new Error("Server error")
      received = result.body.received as number
      this.update(r.id, { progress: received / r.size })
    }

    const done = await fetch(`${url}/complete`, { method: "POST" })
    if (done.status === 409) throw new Error("Incomplete, retrying")
    await this.check(done)
  }

  private async check(res: Response) {
    if (res.ok) return
    if (res.status === 404 && res.url.includes("/uploads/")) throw new RestartUpload()
    if (res.status === 429 || res.status >= 500) throw new Error(`Server said ${res.status}`)
    let message = "Upload refused"
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {}
    throw new PermanentError(message)
  }
}

/** XHR rather than fetch, because fetch cannot report upload progress. */
function putChunk(url: string, blob: Blob, onProgress: (sent: number) => void) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", "application/octet-stream")
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    xhr.onload = () => {
      let body: Record<string, unknown> = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new Error("Network error"))
    xhr.ontimeout = () => reject(new Error("Timed out"))
    xhr.timeout = 5 * 60 * 1000
    xhr.send(blob)
  })
}
