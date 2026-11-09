export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Restart any preview jobs that were cut short by a redeploy.
  const { ensureDirs } = await import("@/modules/media/storage")
  const { resumeProcessing } = await import("@/modules/media/queue")
  await ensureDirs()
  resumeProcessing()
}
