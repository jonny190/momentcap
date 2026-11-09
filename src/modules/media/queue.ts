import { getMedia, listProcessing, markFailed, markReady } from "./repo"
import { processMedia } from "./process"

/**
 * In-process job queue for building previews. Video encoding is CPU heavy,
 * so jobs run one or two at a time rather than all at once.
 */
const CONCURRENCY = 2

type QueueState = { pending: string[]; running: number; queued: Set<string> }
const g = globalThis as unknown as { momentcapQueue?: QueueState }
const state: QueueState = (g.momentcapQueue ??= { pending: [], running: 0, queued: new Set() })

export function enqueue(id: string) {
  if (state.queued.has(id)) return
  state.queued.add(id)
  state.pending.push(id)
  pump()
}

/** Picks up anything left half-done by a restart. Called once at boot. */
export function resumeProcessing() {
  for (const m of listProcessing()) enqueue(m.id)
}

function pump() {
  while (state.running < CONCURRENCY && state.pending.length) {
    const id = state.pending.shift()!
    state.running++
    work(id).finally(() => {
      state.running--
      state.queued.delete(id)
      pump()
    })
  }
}

async function work(id: string) {
  const m = getMedia(id)
  if (!m || m.status !== "processing") return
  try {
    markReady(id, await processMedia(m))
  } catch (err) {
    console.error(`[media] processing failed for ${id}:`, err)
    markFailed(id)
  }
}

/** Test helper: resolves once the queue is empty. */
export async function drainQueue() {
  while (state.running || state.pending.length) await new Promise((r) => setTimeout(r, 20))
}
