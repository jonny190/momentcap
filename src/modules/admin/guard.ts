import { redirect } from "next/navigation"
import { isAdmin } from "@/modules/auth/session"

export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login")
}
