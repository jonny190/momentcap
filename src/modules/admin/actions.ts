"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { checkPassword, endSession, isAdmin, startSession } from "@/modules/auth/session"
import { rateLimit } from "@/modules/core/rate-limit"
import { rotateGuestToken, updateEvent } from "@/modules/event/repo"
import { setHidden } from "@/modules/media/repo"
import { deleteMedia } from "@/modules/media/service"

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login")
}

export type LoginState = { error?: string }

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const h = await headers()
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: "Too many attempts. Try again in a few minutes." }
  }
  if (!checkPassword(String(form.get("password") ?? ""))) {
    return { error: "That password is not right." }
  }
  await startSession()
  redirect("/admin")
}

export async function logout() {
  await endSession()
  redirect("/admin/login")
}

export type SettingsState = { saved?: boolean; error?: string }

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin()
  const name = String(form.get("name") ?? "").trim().slice(0, 80)
  if (!name) return { error: "The event needs a name." }
  updateEvent({
    name,
    welcomeMessage: String(form.get("welcomeMessage") ?? "").trim().slice(0, 280),
    uploadsOpen: form.get("uploadsOpen") === "on",
    galleryOpen: form.get("galleryOpen") === "on",
  })
  revalidatePath("/", "layout")
  return { saved: true }
}

export async function newGuestLink() {
  await requireAdmin()
  rotateGuestToken()
  revalidatePath("/", "layout")
}

export async function setMediaHidden(ids: string[], hidden: boolean) {
  await requireAdmin()
  setHidden(ids.filter((id) => typeof id === "string").slice(0, 500), hidden)
}

export async function removeMedia(ids: string[]) {
  await requireAdmin()
  for (const id of ids.filter((id) => typeof id === "string").slice(0, 500)) await deleteMedia(id)
}
