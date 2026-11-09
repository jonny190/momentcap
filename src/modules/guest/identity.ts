"use client"

const DEVICE_KEY = "mc_device"
const NAME_KEY = "mc_name"

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** A random id for this phone, so guests can remove their own uploads. */
export function deviceId(): string {
  const s = storage()
  let id = s?.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    s?.setItem(DEVICE_KEY, id)
  }
  return id
}

export function savedName(): string {
  return storage()?.getItem(NAME_KEY) ?? ""
}

export function saveName(name: string) {
  const trimmed = name.trim().slice(0, 60)
  if (trimmed) storage()?.setItem(NAME_KEY, trimmed)
  else storage()?.removeItem(NAME_KEY)
}
