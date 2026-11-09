import { db } from "@/modules/core/db"
import { newId } from "@/modules/core/http"

export type EventSettings = {
  name: string
  welcomeMessage: string
  guestToken: string
  uploadsOpen: boolean
  galleryOpen: boolean
}

type Row = {
  name: string
  welcome_message: string
  guest_token: string
  uploads_open: number
  gallery_open: number
}

/** The app hosts exactly one event; its row is created on first use. */
export function getEvent(): EventSettings {
  const conn = db()
  let row = conn.prepare("SELECT * FROM event WHERE id = 1").get() as Row | undefined
  if (!row) {
    conn
      .prepare("INSERT OR IGNORE INTO event (id, name, welcome_message, guest_token) VALUES (1, ?, ?, ?)")
      .run("Our Event", "Snap away! Every photo and video lands straight in the shared album.", newGuestToken())
    row = conn.prepare("SELECT * FROM event WHERE id = 1").get() as Row
  }
  return {
    name: row.name,
    welcomeMessage: row.welcome_message,
    guestToken: row.guest_token,
    uploadsOpen: row.uploads_open === 1,
    galleryOpen: row.gallery_open === 1,
  }
}

export function updateEvent(patch: Partial<Omit<EventSettings, "guestToken">>): EventSettings {
  const current = getEvent()
  const next = { ...current, ...patch }
  db()
    .prepare(
      `UPDATE event SET name = ?, welcome_message = ?, uploads_open = ?, gallery_open = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`
    )
    .run(next.name, next.welcomeMessage, next.uploadsOpen ? 1 : 0, next.galleryOpen ? 1 : 0)
  return getEvent()
}

/** Issues a new guest link. Printed QR codes with the old link stop working. */
export function rotateGuestToken(): string {
  getEvent()
  const token = newGuestToken()
  db().prepare("UPDATE event SET guest_token = ? WHERE id = 1").run(token)
  return token
}

/** Returns the event only if the token matches the current guest link. */
export function eventForToken(token: string): EventSettings | null {
  const event = getEvent()
  return safeTokenEqual(token, event.guestToken) ? event : null
}

function newGuestToken() {
  return newId(8)
}

function safeTokenEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
