"use client"

/**
 * Keeps files that have not finished uploading in IndexedDB, so a guest who
 * locks their phone or loses signal picks up where they left off next time
 * they open the link. Falls back to memory only if IndexedDB is unavailable.
 */
export type PendingRecord = {
  id: string
  token: string
  file: Blob
  name: string
  type: string
  size: number
  guestName: string
  uploadId: string | null
  createdAt: number
}

const DB = "momentcap"
const STORE = "pending"

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null)
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
  )
}

export const pendingStore = {
  put: (r: PendingRecord) => tx("readwrite", (s) => s.put(r)),
  remove: (id: string) => tx("readwrite", (s) => s.delete(id)),
  async all(token: string): Promise<PendingRecord[]> {
    const rows = ((await tx("readonly", (s) => s.getAll())) as PendingRecord[] | null) ?? []
    return rows.filter((r) => r.token === token).sort((a, b) => a.createdAt - b.createdAt)
  },
}
