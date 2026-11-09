import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { resetDbForTests } from "@/modules/core/db"

/** Points DATA_DIR at a fresh temp folder for each test file. */
export function useTempDataDir() {
  const dir = mkdtempSync(join(tmpdir(), "momentcap-test-"))
  process.env.DATA_DIR = dir
  resetDbForTests()
  return {
    dir,
    cleanup() {
      resetDbForTests()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

export function streamOf(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf))
      controller.close()
    },
  })
}
