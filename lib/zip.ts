import archiver from "archiver"
import { createReadStream } from "fs"
import { join, resolve as resolvePath } from "path"

export async function createEventZip(
  photos: Array<{ filename: string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    const base = resolvePath(process.cwd(), "uploads")
    for (const photo of photos) {
      const filePath = resolvePath(base, photo.filename)
      if (!filePath.startsWith(base + "/")) continue
      const name = photo.filename.split("/").pop()!
      archive.append(createReadStream(filePath), { name })
    }

    archive.finalize()
  })
}
