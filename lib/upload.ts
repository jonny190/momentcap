import { writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { randomBytes } from "crypto"

export async function saveFile(
  file: File,
  tenantSlug: string,
  eventSlug: string
): Promise<string> {
  const ext = extname(file.name) || ".jpg"
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`
  const dir = join(process.cwd(), "uploads", tenantSlug, eventSlug)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()))

  return `${tenantSlug}/${eventSlug}/${name}`
}
