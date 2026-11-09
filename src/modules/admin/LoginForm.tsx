"use client"

import { useActionState } from "react"
import { login, type LoginState } from "./actions"

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  )
}
