import { isAdmin } from "@/modules/auth/session"
import { eventForToken } from "@/modules/event/repo"
import { deleteMediaRow, getMedia } from "./repo"
import { removeMediaFiles } from "./storage"
import type { Media } from "./types"

/**
 * Decides whether the current request may see a media item. Admins see
 * everything. Guests need the current event link, the shared gallery
 * switched on, and the item must be finished and not hidden.
 */
export async function viewableMedia(id: string, token: string | null): Promise<Media | null> {
  const m = getMedia(id)
  if (!m) return null
  if (await isAdmin()) return m
  if (!token) return null
  const event = eventForToken(token)
  if (!event || !event.galleryOpen) return null
  if (m.status !== "ready" || m.hidden) return null
  return m
}

export async function deleteMedia(id: string) {
  const m = getMedia(id)
  if (!m) return false
  deleteMediaRow(id)
  await removeMediaFiles(m)
  return true
}
