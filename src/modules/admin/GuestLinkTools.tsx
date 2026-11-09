"use client"

import { useState } from "react"
import { newGuestLink } from "./actions"

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-mist px-3 py-2 text-sm">{url}</code>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="shrink-0 rounded-full bg-white px-3.5 py-2 text-sm ring-1 ring-line hover:ring-ink/30"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  )
}

export function NewLinkButton() {
  return (
    <form
      action={newGuestLink}
      onSubmit={(e) => {
        if (!confirm("Make a new guest link? Any QR codes you have already printed will stop working.")) e.preventDefault()
      }}
    >
      <button className="text-sm text-red-700 underline underline-offset-4">Make a new link</button>
    </form>
  )
}
