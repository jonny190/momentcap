export type MediaKind = "photo" | "video"
export type MediaStatus = "processing" | "ready" | "failed"
export type Variant = "thumb" | "display" | "original"

export type Media = {
  id: string
  kind: MediaKind
  status: MediaStatus
  guestName: string | null
  deviceId: string | null
  originalName: string | null
  mime: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
  originalFile: string
  displayFile: string | null
  thumbFile: string | null
  hidden: boolean
  createdAt: string
}

/** What browsers are allowed to see. Device ids never leave the server. */
export type PublicMedia = {
  id: string
  kind: MediaKind
  status: MediaStatus
  guestName: string | null
  width: number | null
  height: number | null
  duration: number | null
  hidden: boolean
  hasThumb: boolean
  createdAt: string
  mine: boolean
}

export function toPublic(m: Media, deviceId?: string | null): PublicMedia {
  return {
    id: m.id,
    kind: m.kind,
    status: m.status,
    guestName: m.guestName,
    width: m.width,
    height: m.height,
    duration: m.duration,
    hidden: m.hidden,
    hasThumb: Boolean(m.thumbFile),
    createdAt: m.createdAt,
    mine: Boolean(deviceId && m.deviceId === deviceId),
  }
}
