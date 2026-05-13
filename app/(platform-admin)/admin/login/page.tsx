"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PlatformAdminLogin() {
  const router = useRouter()
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })
    if (!result?.ok) {
      setError("Invalid credentials")
    } else {
      router.push("/admin")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm p-8 border border-gray-800 rounded-xl">
        <h1 className="text-white text-xl font-bold mb-6">Platform Admin</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="email" className="sr-only">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
