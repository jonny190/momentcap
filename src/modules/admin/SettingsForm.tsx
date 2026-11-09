"use client"

import { useActionState } from "react"
import { saveSettings, type SettingsState } from "./actions"

type Props = { name: string; welcomeMessage: string; uploadsOpen: boolean; galleryOpen: boolean }

export function SettingsForm(props: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {})

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Event name</label>
        <input id="name" name="name" defaultValue={props.name} required maxLength={80} className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2" />
      </div>
      <div>
        <label htmlFor="welcomeMessage" className="block text-sm font-medium">Message for guests</label>
        <textarea
          id="welcomeMessage"
          name="welcomeMessage"
          defaultValue={props.welcomeMessage}
          maxLength={280}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2"
        />
        <p className="mt-1 text-xs text-ink/50">Shown under the event name on the camera screen.</p>
      </div>
      <Toggle name="uploadsOpen" defaultChecked={props.uploadsOpen} label="Accept new photos and videos" hint="Turn this off when the event is over." />
      <Toggle name="galleryOpen" defaultChecked={props.galleryOpen} label="Let guests see the album" hint="Guests can browse and download everything that has not been hidden." />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving" : "Save changes"}
        </button>
        {state.saved && !pending && <span className="text-sm text-emerald-700">Changes saved</span>}
        {state.error && <span className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  )
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink/50">{hint}</span>
      </span>
    </label>
  )
}
