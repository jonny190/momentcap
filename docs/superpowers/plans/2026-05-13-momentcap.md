# MomentCap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MomentCap - a multi-tenant event photo capture platform where guests scan a QR code, their phone camera opens instantly, and photos upload directly to the platform with zero friction.

**Architecture:** Next.js 14 App Router with SQLite via Prisma for data, local disk (volume-mounted) for photo storage, and NextAuth.js v5 for authentication. Three distinct areas: a frictionless guest capture page (`/c/[token]`), a tenant admin panel (`/[tenant]/admin`), and a platform super-admin panel (`/admin`).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma + SQLite, NextAuth.js v5, bcryptjs, qrcode, archiver, Vitest + Testing Library

---

## File Map

```
momentcap/
  lib/
    session.ts                         - shared getTenantId helper used by all admin API routes
  app/
    (platform-admin)/admin/
      page.tsx                         - platform admin dashboard (tenant list + stats)
      login/page.tsx                   - platform admin login form
    (tenant-admin)/[tenant]/admin/
      page.tsx                         - tenant dashboard (event list)
      login/page.tsx                   - tenant login form
      events/new/page.tsx              - create event form
      events/[eventId]/page.tsx        - event detail: QR codes + gallery
      events/[eventId]/qrcodes/new/page.tsx  - create QR code form
    c/[token]/
      page.tsx                         - guest capture page (no auth)
    api/
      auth/[...nextauth]/route.ts      - NextAuth handler
      upload/[token]/route.ts          - guest photo upload (no auth)
      admin/events/route.ts            - GET list / POST create events
      admin/events/[eventId]/route.ts  - GET single event
      admin/events/[eventId]/qrcodes/route.ts   - GET list / POST create QR codes
      admin/events/[eventId]/qrcodes/[id]/download/route.ts  - GET QR code PNG
      admin/events/[eventId]/photos/route.ts    - GET list photos
      admin/events/[eventId]/download/route.ts  - GET ZIP of all event photos
      admin/photos/[photoId]/download/route.ts  - GET single photo file
      platform/tenants/route.ts        - GET list / POST create tenants
      platform/tenants/[tenantId]/route.ts      - PATCH edit/disable tenant
      platform/tenants/[tenantId]/impersonate/route.ts  - POST start / DELETE end impersonation
    layout.tsx
    globals.css
  components/
    capture/CaptureInterface.tsx       - auto-trigger camera + upload + reset loop
    admin/EventCard.tsx                - event list item
    admin/QRCodeCard.tsx               - QR code display + download button
    admin/PhotoGrid.tsx                - photo gallery grid
    platform/TenantRow.tsx             - tenant table row with impersonate/edit/disable
    platform/ImpersonationBanner.tsx   - amber banner shown during impersonation
    ui/Button.tsx                      - shared button component
  lib/
    auth.ts                            - NextAuth config + role helpers
    db.ts                              - Prisma client singleton
    upload.ts                          - save uploaded file to disk
    zip.ts                             - create ZIP buffer from photo list
    qr.ts                              - generate QR code PNG buffer from URL
  prisma/
    schema.prisma
  types/
    next-auth.d.ts                     - augment NextAuth session types
  public/
    manifest.json                      - PWA manifest (standalone display mode)
  tests/
    setup.ts
    lib/upload.test.ts
    lib/qr.test.ts
    lib/zip.test.ts
    api/upload.test.ts
    components/CaptureInterface.test.tsx
  uploads/                             - gitignored, volume-mounted in production
  .env.example
  .gitignore
  Dockerfile
  docker-compose.yml
  next.config.ts
  vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via npx)
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `public/manifest.json`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /home/jonny/MomentCap
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js 14 project created with TypeScript and Tailwind.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client bcryptjs qrcode archiver
npm install -D @types/bcryptjs @types/qrcode @types/archiver
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 4: Write vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
})
```

- [ ] **Step 5: Write tests/setup.ts**

```typescript
// tests/setup.ts
import "@testing-library/jest-dom"
```

- [ ] **Step 6: Write next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from "next"

const config: NextConfig = {
  output: "standalone",
}

export default config
```

- [ ] **Step 7: Write .env.example**

```
# NextAuth
NEXTAUTH_SECRET=change-me-to-a-random-string
NEXTAUTH_URL=http://localhost:3000

# Platform admin credentials
PLATFORM_ADMIN_EMAIL=admin@momentcap.app
PLATFORM_ADMIN_PASSWORD=change-me

# Database
DATABASE_URL="file:./prisma/dev.db"
```

- [ ] **Step 8: Write .gitignore additions**

Append to the generated `.gitignore`:

```
# Photo uploads
/uploads

# SQLite database
*.db
*.db-shm
*.db-wal

# Superpowers brainstorm files
.superpowers/
```

- [ ] **Step 9: Write public/manifest.json**

```json
{
  "name": "MomentCap",
  "short_name": "MomentCap",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 10: Add test script to package.json**

In `package.json`, add to the `scripts` block:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 2: Write prisma/schema.prisma**

Replace the generated schema with:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Tenant {
  id           String     @id @default(cuid())
  name         String
  slug         String     @unique
  email        String     @unique
  passwordHash String
  enabled      Boolean    @default(true)
  createdAt    DateTime   @default(now())
  events       Event[]
  auditLogs    AuditLog[]
}

model Event {
  id        String    @id @default(cuid())
  tenantId  String
  name      String
  slug      String
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  qrCodes   QRCode[]

  @@unique([tenantId, slug])
}

model QRCode {
  id        String   @id @default(cuid())
  eventId   String
  label     String?
  token     String   @unique @default(cuid())
  createdAt DateTime @default(now())
  event     Event    @relation(fields: [eventId], references: [id])
  photos    Photo[]
}

model Photo {
  id         String   @id @default(cuid())
  qrCodeId   String
  filename   String
  uploadedAt DateTime @default(now())
  qrCode     QRCode   @relation(fields: [qrCodeId], references: [id])
}

model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String
  action    String
  metadata  String
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: `prisma/migrations/` created, `prisma/dev.db` created.

- [ ] **Step 4: Write lib/db.ts**

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add database schema and Prisma client"
```

---

## Task 3: Authentication

**Files:**
- Create: `lib/auth.ts`
- Create: `types/next-auth.d.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/(platform-admin)/admin/login/page.tsx`
- Create: `app/(tenant-admin)/[tenant]/admin/login/page.tsx`

- [ ] **Step 1: Write types/next-auth.d.ts**

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: "platform_admin" | "tenant_admin"
      tenantId: string | null
      tenantSlug: string | null
      impersonatingAs: string | null
      impersonatingSlug: string | null
    } & DefaultSession["user"]
  }
}
```

- [ ] **Step 2: Write lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null

        if (email === process.env.PLATFORM_ADMIN_EMAIL &&
            password === process.env.PLATFORM_ADMIN_PASSWORD) {
          return { id: "platform_admin", email, role: "platform_admin" }
        }

        const tenant = await db.tenant.findFirst({ where: { email, enabled: true } })
        if (!tenant) return null

        const valid = await bcrypt.compare(password, tenant.passwordHash)
        if (!valid) return null

        return {
          id: tenant.id,
          email,
          role: "tenant_admin",
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as Record<string, unknown>
        token.role = u.role
        token.tenantId = u.tenantId ?? null
        token.tenantSlug = u.tenantSlug ?? null
        token.impersonatingAs = null
        token.impersonatingSlug = null
      }
      if (trigger === "update" && session) {
        token.impersonatingAs = session.impersonatingAs ?? null
        token.impersonatingSlug = session.impersonatingSlug ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as "platform_admin" | "tenant_admin"
      session.user.tenantId = (token.tenantId as string) ?? null
      session.user.tenantSlug = (token.tenantSlug as string) ?? null
      session.user.impersonatingAs = (token.impersonatingAs as string) ?? null
      session.user.impersonatingSlug = (token.impersonatingSlug as string) ?? null
      return session
    },
  },
})
```

- [ ] **Step 3: Write app/api/auth/[...nextauth]/route.ts**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Write platform admin login page**

```tsx
// app/(platform-admin)/admin/login/page.tsx
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
    if (result?.error) {
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
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
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
```

- [ ] **Step 5: Write tenant admin login page**

```tsx
// app/(tenant-admin)/[tenant]/admin/login/page.tsx
"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"

export default function TenantAdminLogin() {
  const router = useRouter()
  const params = useParams<{ tenant: string }>()
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })
    if (result?.error) {
      setError("Invalid credentials")
    } else {
      router.push(`/${params.tenant}/admin`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm p-8 border border-gray-800 rounded-xl">
        <h1 className="text-white text-xl font-bold mb-2">MomentCap</h1>
        <p className="text-gray-500 text-sm mb-6">{params.tenant}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-green-700 hover:bg-green-800 text-white rounded-lg py-2 text-sm font-medium"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write lib/session.ts**

```typescript
// lib/session.ts
import { auth } from "./auth"

export async function getTenantId(
  session: Awaited<ReturnType<typeof auth>>
): Promise<string | null> {
  if (!session) return null
  if (session.user.impersonatingAs) return session.user.impersonatingAs
  if (session.user.role === "tenant_admin") return session.user.tenantId
  return null
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts lib/session.ts types/ app/api/auth/ app/\(platform-admin\)/ app/\(tenant-admin\)/
git commit -m "feat: add NextAuth authentication for platform and tenant admins"
```

---

## Task 4: Guest Capture Page

**Files:**
- Create: `components/capture/CaptureInterface.tsx`
- Create: `app/c/[token]/page.tsx`
- Test: `tests/components/CaptureInterface.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// tests/components/CaptureInterface.test.tsx
import { render, screen } from "@testing-library/react"
import { CaptureInterface } from "@/components/capture/CaptureInterface"
import { vi } from "vitest"

global.fetch = vi.fn().mockResolvedValue({ ok: true })

describe("CaptureInterface", () => {
  it("renders a hidden file input with camera capture", () => {
    render(<CaptureInterface token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.accept).toBe("image/*")
    expect(input.getAttribute("capture")).toBe("environment")
  })

  it("shows uploading state during upload", async () => {
    let resolveUpload!: () => void
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveUpload = () => resolve({ ok: true }) })
    )
    render(<CaptureInterface token="test-token" />)
    // simulate file selection
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    Object.defineProperty(input, "files", { value: [file] })
    input.dispatchEvent(new Event("change", { bubbles: true }))
    expect(await screen.findByText(/uploading/i)).toBeInTheDocument()
    resolveUpload()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/components/CaptureInterface.test.tsx
```

Expected: FAIL - module not found.

- [ ] **Step 3: Write components/capture/CaptureInterface.tsx**

```tsx
// components/capture/CaptureInterface.tsx
"use client"
import { useRef, useState, useEffect } from "react"

type Status = "idle" | "uploading" | "done" | "error"

export function CaptureInterface({ token }: { token: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>("idle")

  const openCamera = () => inputRef.current?.click()

  useEffect(() => {
    openCamera()
  }, [])

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus("uploading")

    try {
      const body = new FormData()
      body.append("photo", file)
      const res = await fetch(`/api/upload/${token}`, { method: "POST", body })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    } finally {
      if (inputRef.current) inputRef.current.value = ""
      setTimeout(() => {
        setStatus("idle")
        openCamera()
      }, 1200)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {status === "idle" && (
        <button
          onClick={openCamera}
          className="flex flex-col items-center gap-3 text-white opacity-70 hover:opacity-100"
        >
          <span className="text-7xl">📷</span>
          <span className="text-sm">Tap to take a photo</span>
        </button>
      )}

      {status === "uploading" && (
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Uploading...</span>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-3 text-green-400">
          <span className="text-5xl">✓</span>
          <span className="text-sm">Photo saved!</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 text-red-400">
          <span className="text-sm">Upload failed - please try again</span>
          <button onClick={openCamera} className="text-white text-sm underline">
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write app/c/[token]/page.tsx**

```tsx
// app/c/[token]/page.tsx
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { CaptureInterface } from "@/components/capture/CaptureInterface"

export const metadata: Metadata = {
  title: "MomentCap",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
  },
}

export default async function CapturePage({ params }: { params: { token: string } }) {
  const qrCode = await db.qRCode.findUnique({
    where: { token: params.token },
    include: { event: true },
  })

  if (!qrCode || !qrCode.event.active) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 text-sm">This event has ended.</p>
      </div>
    )
  }

  return (
    <>
      <link rel="manifest" href="/manifest.json" />
      <CaptureInterface token={params.token} />
    </>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- tests/components/CaptureInterface.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/capture/ app/c/ tests/components/ public/manifest.json
git commit -m "feat: add zero-friction guest capture page with PWA support"
```

---

## Task 5: Upload API and File Storage

**Files:**
- Create: `lib/upload.ts`
- Create: `app/api/upload/[token]/route.ts`
- Test: `tests/lib/upload.test.ts`
- Test: `tests/api/upload.test.ts`

- [ ] **Step 1: Write failing unit test for upload helper**

```typescript
// tests/lib/upload.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { saveFile } from "@/lib/upload"

vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

describe("saveFile", () => {
  it("returns a relative path with tenant/event/filename structure", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" })
    const result = await saveFile(file, "daveys", "wedding")
    expect(result).toMatch(/^daveys\/wedding\/\d+-[a-f0-9]+\.jpg$/)
  })

  it("uses .jpg extension when file has no extension", async () => {
    const file = new File(["data"], "photo", { type: "image/jpeg" })
    const result = await saveFile(file, "daveys", "wedding")
    expect(result).toMatch(/\.jpg$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/lib/upload.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Write lib/upload.ts**

```typescript
// lib/upload.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- tests/lib/upload.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing API test**

```typescript
// tests/api/upload.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/upload/[token]/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  db: {
    qRCode: {
      findUnique: vi.fn(),
    },
    photo: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock("@/lib/upload", () => ({
  saveFile: vi.fn().mockResolvedValue("daveys/wedding/123-abc.jpg"),
}))

import { db } from "@/lib/db"

describe("POST /api/upload/[token]", () => {
  it("returns 404 for unknown token", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue(null)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/bad-token", {
      method: "POST",
      body: form,
    })
    const res = await POST(req, { params: { token: "bad-token" } })
    expect(res.status).toBe(404)
  })

  it("returns 200 and creates photo record for valid token", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue({
      id: "qr1",
      token: "valid",
      label: null,
      eventId: "ev1",
      createdAt: new Date(),
      event: { id: "ev1", active: true, tenant: { slug: "daveys" }, slug: "wedding" },
    } as any)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/valid", {
      method: "POST",
      body: form,
    })
    const res = await POST(req, { params: { token: "valid" } })
    expect(res.status).toBe(200)
    expect(db.photo.create).toHaveBeenCalledWith({
      data: { qrCodeId: "qr1", filename: "daveys/wedding/123-abc.jpg" },
    })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm run test:run -- tests/api/upload.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 7: Write app/api/upload/[token]/route.ts**

```typescript
// app/api/upload/[token]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { saveFile } from "@/lib/upload"

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const qrCode = await db.qRCode.findUnique({
    where: { token: params.token },
    include: { event: { include: { tenant: true } } },
  })

  if (!qrCode || !qrCode.event.active) {
    return NextResponse.json({ error: "Invalid or inactive event" }, { status: 404 })
  }

  const form = await req.formData()
  const file = form.get("photo") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const filename = await saveFile(file, qrCode.event.tenant.slug, qrCode.event.slug)

  await db.photo.create({ data: { qrCodeId: qrCode.id, filename } })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/upload.ts app/api/upload/ tests/lib/upload.test.ts tests/api/upload.test.ts
git commit -m "feat: add photo upload API with file storage"
```

---

## Task 6: Tenant Admin - Events

**Files:**
- Create: `components/admin/EventCard.tsx`
- Create: `components/ui/Button.tsx`
- Create: `app/api/admin/events/route.ts`
- Create: `app/api/admin/events/[eventId]/route.ts`
- Create: `app/(tenant-admin)/[tenant]/admin/page.tsx`
- Create: `app/(tenant-admin)/[tenant]/admin/events/new/page.tsx`

- [ ] **Step 1: Write components/ui/Button.tsx**

```tsx
// components/ui/Button.tsx
import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger"
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-green-700 hover:bg-green-800 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    danger: "bg-red-900 hover:bg-red-800 text-red-200 border border-red-800",
  }
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
```

Note: install `clsx` and `tailwind-merge` and create `lib/utils.ts`:

```bash
npm install clsx tailwind-merge
```

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Write app/api/admin/events/route.ts**

```typescript
// app/api/admin/events/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  const tenantId = await getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const events = await db.event.findMany({
    where: { tenantId },
    include: { _count: { select: { qrCodes: true } } },
    orderBy: { createdAt: "desc" },
  })

  const eventsWithPhotos = await Promise.all(
    events.map(async (event) => {
      const photoCount = await db.photo.count({
        where: { qrCode: { eventId: event.id } },
      })
      return { ...event, photoCount }
    })
  )

  return NextResponse.json(eventsWithPhotos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const tenantId = await getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const event = await db.event.create({
    data: { tenantId, name: name.trim(), slug },
  })

  return NextResponse.json(event, { status: 201 })
}
```

- [ ] **Step 3: Write components/admin/EventCard.tsx**

```tsx
// components/admin/EventCard.tsx
import Link from "next/link"
import { Button } from "@/components/ui/Button"

interface EventCardProps {
  event: {
    id: string
    name: string
    active: boolean
    _count: { qrCodes: number }
    photoCount: number
  }
  tenantSlug: string
}

export function EventCard({ event, tenantSlug }: EventCardProps) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-white font-medium">{event.name}</p>
        <p className="text-gray-500 text-xs mt-1">
          {event._count.qrCodes} QR {event._count.qrCodes === 1 ? "code" : "codes"} ·{" "}
          {event.photoCount} {event.photoCount === 1 ? "photo" : "photos"} ·{" "}
          <span className={event.active ? "text-green-400" : "text-gray-500"}>
            {event.active ? "Active" : "Ended"}
          </span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/${tenantSlug}/admin/events/${event.id}`}>
          <Button variant="secondary" className="text-xs py-1.5">Manage</Button>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write tenant dashboard page**

```tsx
// app/(tenant-admin)/[tenant]/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { EventCard } from "@/components/admin/EventCard"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function TenantDashboard({ params }: { params: { tenant: string } }) {
  const session = await auth()

  const isAuthorised =
    (session?.user.role === "tenant_admin" && session.user.tenantSlug === params.tenant) ||
    (session?.user.role === "platform_admin" && session.user.impersonatingSlug === params.tenant)

  if (!isAuthorised) redirect(`/${params.tenant}/admin/login`)

  const tenantId = session!.user.impersonatingAs ?? session!.user.tenantId!
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) redirect(`/${params.tenant}/admin/login`)

  const events = await db.event.findMany({
    where: { tenantId },
    include: { _count: { select: { qrCodes: true } } },
    orderBy: { createdAt: "desc" },
  })

  const eventsWithPhotos = await Promise.all(
    events.map(async (event) => ({
      ...event,
      photoCount: await db.photo.count({ where: { qrCode: { eventId: event.id } } }),
    }))
  )

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{tenant.name}</h1>
          <p className="text-gray-500 text-sm">Events</p>
        </div>
        <Link href={`/${params.tenant}/admin/events/new`}>
          <Button>+ New Event</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {eventsWithPhotos.map((event) => (
          <EventCard key={event.id} event={event} tenantSlug={params.tenant} />
        ))}
        {eventsWithPhotos.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No events yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write create event page**

```tsx
// app/(tenant-admin)/[tenant]/admin/events/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewEvent() {
  const router = useRouter()
  const params = useParams<{ tenant: string }>()
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      setError("Failed to create event")
      return
    }
    router.push(`/${params.tenant}/admin`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">New Event</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          required
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit">Create Event</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Write event PATCH route (active/ended toggle)**

```typescript
// app/api/admin/events/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth()
  const tenantId = await getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await db.event.findFirst({ where: { id: params.eventId, tenantId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { active } = await req.json()
  const updated = await db.event.update({
    where: { id: params.eventId },
    data: { active },
  })
  return NextResponse.json(updated)
}
```

Add a toggle button to `EventCard.tsx`:

```tsx
// In components/admin/EventCard.tsx — add after the Manage button:
import { useRouter } from "next/navigation"

// Add inside the component:
const router = useRouter()

async function handleToggleActive() {
  await fetch(`/api/admin/events/${event.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: !event.active }),
  })
  router.refresh()
}

// Add after the Manage Link:
<Button
  variant={event.active ? "danger" : "secondary"}
  className="text-xs py-1.5"
  onClick={handleToggleActive}
>
  {event.active ? "End Event" : "Reopen"}
</Button>
```

Mark `EventCard` as `"use client"` since it now uses `useRouter`.

- [ ] **Step 7: Commit**

```bash
git add components/ lib/utils.ts lib/session.ts app/api/admin/events/ app/\(tenant-admin\)/
git commit -m "feat: add tenant admin event management"
```

---

## Task 7: QR Code Generation and Management

**Files:**
- Create: `lib/qr.ts`
- Create: `app/api/admin/events/[eventId]/qrcodes/route.ts`
- Create: `app/api/admin/events/[eventId]/qrcodes/[id]/download/route.ts`
- Create: `app/(tenant-admin)/[tenant]/admin/events/[eventId]/page.tsx`
- Create: `components/admin/QRCodeCard.tsx`
- Test: `tests/lib/qr.test.ts`

- [ ] **Step 1: Write failing test for QR helper**

```typescript
// tests/lib/qr.test.ts
import { describe, it, expect } from "vitest"
import { generateQRCodePNG } from "@/lib/qr"

describe("generateQRCodePNG", () => {
  it("returns a Buffer containing PNG data for a URL", async () => {
    const buf = await generateQRCodePNG("https://example.com/c/abc123")
    expect(buf).toBeInstanceOf(Buffer)
    // PNG magic bytes: 89 50 4E 47
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/lib/qr.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Write lib/qr.ts**

```typescript
// lib/qr.ts
import QRCode from "qrcode"

export async function generateQRCodePNG(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", width: 400, margin: 2 })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- tests/lib/qr.test.ts
```

Expected: PASS

- [ ] **Step 5: Write QR codes API route**

```typescript
// app/api/admin/events/[eventId]/qrcodes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantId } from "@/lib/session"
import { db } from "@/lib/db"

async function assertEventOwnership(eventId: string, tenantId: string) {
  const event = await db.event.findFirst({ where: { id: eventId, tenantId } })
  return event
}

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await auth()
  const tenantId = await getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await assertEventOwnership(params.eventId, tenantId)
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const qrCodes = await db.qRCode.findMany({
    where: { eventId: params.eventId },
    include: { _count: { select: { photos: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(qrCodes)
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await auth()
  const tenantId = await getTenantId(session)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await assertEventOwnership(params.eventId, tenantId)
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { label } = await req.json()

  const qrCode = await db.qRCode.create({
    data: { eventId: params.eventId, label: label?.trim() || null },
  })

  return NextResponse.json(qrCode, { status: 201 })
}
```

- [ ] **Step 6: Write QR code download route**

```typescript
// app/api/admin/events/[eventId]/qrcodes/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateQRCodePNG } from "@/lib/qr"

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  const session = await auth()
  const tenantId =
    session?.user.impersonatingAs ??
    (session?.user.role === "tenant_admin" ? session.user.tenantId : null)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const qrCode = await db.qRCode.findFirst({
    where: { id: params.id, eventId: params.eventId, event: { tenantId } },
  })
  if (!qrCode) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const captureUrl = `${process.env.NEXTAUTH_URL}/c/${qrCode.token}`
  const png = await generateQRCodePNG(captureUrl)
  const label = qrCode.label ?? "primary"

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${label}.png"`,
    },
  })
}
```

- [ ] **Step 7: Write components/admin/QRCodeCard.tsx**

```tsx
// components/admin/QRCodeCard.tsx
"use client"
import { Button } from "@/components/ui/Button"

interface QRCodeCardProps {
  qrCode: {
    id: string
    label: string | null
    token: string
    eventId: string
    _count: { photos: number }
  }
}

export function QRCodeCard({ qrCode }: QRCodeCardProps) {
  const label = qrCode.label ?? "Primary"
  const downloadUrl = `/api/admin/events/${qrCode.eventId}/qrcodes/${qrCode.id}/download`

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-gray-500 text-xs mt-1">
          {qrCode._count.photos} {qrCode._count.photos === 1 ? "photo" : "photos"}
        </p>
      </div>
      <a href={downloadUrl} download>
        <Button variant="secondary" className="text-xs py-1.5">Download PNG</Button>
      </a>
    </div>
  )
}
```

- [ ] **Step 8: Write event detail page**

```tsx
// app/(tenant-admin)/[tenant]/admin/events/[eventId]/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { QRCodeCard } from "@/components/admin/QRCodeCard"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function EventDetail({
  params,
}: {
  params: { tenant: string; eventId: string }
}) {
  const session = await auth()
  const isAuthorised =
    (session?.user.role === "tenant_admin" && session.user.tenantSlug === params.tenant) ||
    (session?.user.role === "platform_admin" && session.user.impersonatingSlug === params.tenant)

  if (!isAuthorised) redirect(`/${params.tenant}/admin/login`)

  const tenantId = session!.user.impersonatingAs ?? session!.user.tenantId!
  const event = await db.event.findFirst({
    where: { id: params.eventId, tenantId },
    include: {
      qrCodes: { include: { _count: { select: { photos: true } } }, orderBy: { createdAt: "asc" } },
    },
  })

  if (!event) redirect(`/${params.tenant}/admin`)

  const photoCount = await db.photo.count({ where: { qrCode: { eventId: event.id } } })

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${params.tenant}/admin`} className="text-gray-500 text-sm hover:text-white">
          ← Events
        </Link>
        <h1 className="text-xl font-bold mt-2">{event.name}</h1>
        <p className="text-gray-500 text-sm">{photoCount} photos</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">QR Codes</h2>
          <Link href={`/${params.tenant}/admin/events/${params.eventId}/qrcodes/new`}>
            <Button variant="secondary" className="text-xs py-1.5">+ Add Code</Button>
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {event.qrCodes.map((qr) => (
            <QRCodeCard key={qr.id} qrCode={qr} />
          ))}
          {event.qrCodes.length === 0 && (
            <p className="text-gray-600 text-sm py-4 text-center">No QR codes yet.</p>
          )}
        </div>
      </div>

      {photoCount > 0 && (
        <div className="flex gap-3">
          <Link href={`/${params.tenant}/admin/events/${params.eventId}/gallery`}>
            <Button variant="secondary">View Gallery</Button>
          </Link>
          <a href={`/api/admin/events/${params.eventId}/download`}>
            <Button>Download All (ZIP)</Button>
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Write create QR code page**

```tsx
// app/(tenant-admin)/[tenant]/admin/events/[eventId]/qrcodes/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewQRCode() {
  const router = useRouter()
  const params = useParams<{ tenant: string; eventId: string }>()
  const [label, setLabel] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/admin/events/${params.eventId}/qrcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    })
    router.push(`/${params.tenant}/admin/events/${params.eventId}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">Add QR Code</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">
            Label (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Ceremony, Reception (leave blank for primary)"
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm"
          />
        </div>
        <Button type="submit">Create QR Code</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 10: Run all tests**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add lib/qr.ts app/api/admin/events/ components/admin/QRCodeCard.tsx app/\(tenant-admin\)/
git commit -m "feat: add QR code generation and management"
```

---

## Task 8: Photo Gallery and Downloads

**Files:**
- Create: `lib/zip.ts`
- Create: `components/admin/PhotoGrid.tsx`
- Create: `app/api/admin/events/[eventId]/photos/route.ts`
- Create: `app/api/admin/events/[eventId]/download/route.ts`
- Create: `app/api/admin/photos/[photoId]/download/route.ts`
- Create: `app/(tenant-admin)/[tenant]/admin/events/[eventId]/gallery/page.tsx`
- Test: `tests/lib/zip.test.ts`

- [ ] **Step 1: Write failing test for ZIP helper**

```typescript
// tests/lib/zip.test.ts
import { describe, it, expect, vi } from "vitest"
import { createEventZip } from "@/lib/zip"

vi.mock("fs", () => ({
  createReadStream: vi.fn().mockReturnValue({
    pipe: vi.fn(),
    on: vi.fn(),
  }),
}))

describe("createEventZip", () => {
  it("returns a Buffer", async () => {
    // With no files, archiver still returns a valid buffer
    const buf = await createEventZip([])
    expect(buf).toBeInstanceOf(Buffer)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/lib/zip.test.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Write lib/zip.ts**

```typescript
// lib/zip.ts
import archiver from "archiver"
import { createReadStream } from "fs"
import { join } from "path"

export async function createEventZip(
  photos: Array<{ filename: string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    for (const photo of photos) {
      const filePath = join(process.cwd(), "uploads", photo.filename)
      const name = photo.filename.split("/").pop()!
      archive.append(createReadStream(filePath), { name })
    }

    archive.finalize()
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- tests/lib/zip.test.ts
```

Expected: PASS

- [ ] **Step 5: Write photos list API route**

```typescript
// app/api/admin/events/[eventId]/photos/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await auth()
  const tenantId =
    session?.user.impersonatingAs ??
    (session?.user.role === "tenant_admin" ? session.user.tenantId : null)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await db.event.findFirst({ where: { id: params.eventId, tenantId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const photos = await db.photo.findMany({
    where: { qrCode: { eventId: params.eventId } },
    include: { qrCode: { select: { label: true } } },
    orderBy: { uploadedAt: "desc" },
  })

  return NextResponse.json(photos)
}
```

- [ ] **Step 6: Write ZIP download route**

```typescript
// app/api/admin/events/[eventId]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createEventZip } from "@/lib/zip"

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await auth()
  const tenantId =
    session?.user.impersonatingAs ??
    (session?.user.role === "tenant_admin" ? session.user.tenantId : null)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const event = await db.event.findFirst({ where: { id: params.eventId, tenantId } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const photos = await db.photo.findMany({
    where: { qrCode: { eventId: params.eventId } },
    select: { filename: true },
  })

  const zip = await createEventZip(photos)

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.slug}-photos.zip"`,
    },
  })
}
```

- [ ] **Step 7: Write individual photo download route**

```typescript
// app/api/admin/photos/[photoId]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import { join, extname } from "path"

export async function GET(req: NextRequest, { params }: { params: { photoId: string } }) {
  const session = await auth()
  const tenantId =
    session?.user.impersonatingAs ??
    (session?.user.role === "tenant_admin" ? session.user.tenantId : null)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const photo = await db.photo.findFirst({
    where: { id: params.photoId, qrCode: { event: { tenantId } } },
  })
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filePath = join(process.cwd(), "uploads", photo.filename)
  const buffer = await readFile(filePath)
  const ext = extname(photo.filename).slice(1) || "jpg"
  const name = photo.filename.split("/").pop()!

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": `image/${ext}`,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  })
}
```

- [ ] **Step 8: Write components/admin/PhotoGrid.tsx**

```tsx
// components/admin/PhotoGrid.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface Photo {
  id: string
  filename: string
  uploadedAt: string
  qrCode: { label: string | null }
}

export function PhotoGrid({ photos, eventId }: { photos: Photo[]; eventId: string }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelected(photo.id)}
            className="aspect-square bg-gray-900 rounded-lg overflow-hidden hover:ring-2 ring-white transition-all"
          >
            <img
              src={`/api/admin/photos/${photo.id}/view`}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/api/admin/photos/${selected}/view`}
              alt=""
              className="w-full rounded-xl"
            />
            <div className="flex gap-3 mt-4 justify-center">
              <a href={`/api/admin/photos/${selected}/download`} download>
                <Button variant="secondary">Download</Button>
              </a>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

Note: add a `/api/admin/photos/[photoId]/view` route for inline image display (same as download but without Content-Disposition):

```typescript
// app/api/admin/photos/[photoId]/view/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import { join, extname } from "path"

export async function GET(req: NextRequest, { params }: { params: { photoId: string } }) {
  const session = await auth()
  const tenantId =
    session?.user.impersonatingAs ??
    (session?.user.role === "tenant_admin" ? session.user.tenantId : null)
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const photo = await db.photo.findFirst({
    where: { id: params.photoId, qrCode: { event: { tenantId } } },
  })
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filePath = join(process.cwd(), "uploads", photo.filename)
  const buffer = await readFile(filePath)
  const ext = extname(photo.filename).slice(1) || "jpg"

  return new NextResponse(buffer, {
    headers: { "Content-Type": `image/${ext}`, "Cache-Control": "private, max-age=3600" },
  })
}
```

- [ ] **Step 9: Write gallery page**

```tsx
// app/(tenant-admin)/[tenant]/admin/events/[eventId]/gallery/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PhotoGrid } from "@/components/admin/PhotoGrid"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default async function GalleryPage({
  params,
}: {
  params: { tenant: string; eventId: string }
}) {
  const session = await auth()
  const isAuthorised =
    (session?.user.role === "tenant_admin" && session.user.tenantSlug === params.tenant) ||
    (session?.user.role === "platform_admin" && session.user.impersonatingSlug === params.tenant)
  if (!isAuthorised) redirect(`/${params.tenant}/admin/login`)

  const tenantId = session!.user.impersonatingAs ?? session!.user.tenantId!
  const event = await db.event.findFirst({ where: { id: params.eventId, tenantId } })
  if (!event) redirect(`/${params.tenant}/admin`)

  const photos = await db.photo.findMany({
    where: { qrCode: { eventId: params.eventId } },
    include: { qrCode: { select: { label: true } } },
    orderBy: { uploadedAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/${params.tenant}/admin/events/${params.eventId}`}
            className="text-gray-500 text-sm hover:text-white"
          >
            ← {event.name}
          </Link>
          <h1 className="text-xl font-bold mt-1">Gallery</h1>
          <p className="text-gray-500 text-sm">{photos.length} photos</p>
        </div>
        <a href={`/api/admin/events/${params.eventId}/download`}>
          <Button>Download All (ZIP)</Button>
        </a>
      </div>
      <PhotoGrid photos={photos} eventId={params.eventId} />
    </div>
  )
}
```

- [ ] **Step 10: Run all tests**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add lib/zip.ts components/admin/PhotoGrid.tsx app/api/admin/ app/\(tenant-admin\)/
git commit -m "feat: add photo gallery and download functionality"
```

---

## Task 9: Platform Admin - Tenant Management

**Files:**
- Create: `app/api/platform/tenants/route.ts`
- Create: `app/api/platform/tenants/[tenantId]/route.ts`
- Create: `components/platform/TenantRow.tsx`
- Create: `app/(platform-admin)/admin/page.tsx`

- [ ] **Step 1: Write tenants API routes**

```typescript
// app/api/platform/tenants/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

async function assertPlatformAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user.role === "platform_admin"
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!(await assertPlatformAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenants = await db.tenant.findMany({
    include: {
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const tenantsWithPhotos = await Promise.all(
    tenants.map(async (tenant) => ({
      ...tenant,
      photoCount: await db.photo.count({ where: { qrCode: { event: { tenantId: tenant.id } } } }),
    }))
  )

  return NextResponse.json(tenantsWithPhotos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!(await assertPlatformAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, slug, email, password } = await req.json()

  if (!name || !slug || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  }

  const existing = await db.tenant.findFirst({ where: { OR: [{ slug }, { email }] } })
  if (existing) {
    return NextResponse.json({ error: "Slug or email already in use" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const tenant = await db.tenant.create({
    data: { name, slug: slug.toLowerCase(), email, passwordHash },
  })

  return NextResponse.json({ ...tenant, passwordHash: undefined }, { status: 201 })
}
```

```typescript
// app/api/platform/tenants/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(req: NextRequest, { params }: { params: { tenantId: string } }) {
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (typeof body.enabled === "boolean") updateData.enabled = body.enabled
  if (body.name) updateData.name = body.name.trim()
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12)

  const tenant = await db.tenant.update({
    where: { id: params.tenantId },
    data: updateData,
  })

  return NextResponse.json({ ...tenant, passwordHash: undefined })
}
```

- [ ] **Step 2: Write components/platform/TenantRow.tsx**

```tsx
// components/platform/TenantRow.tsx
"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface TenantRowProps {
  tenant: {
    id: string
    name: string
    slug: string
    email: string
    enabled: boolean
    _count: { events: number }
    photoCount: number
  }
}

export function TenantRow({ tenant }: TenantRowProps) {
  const router = useRouter()

  async function handleImpersonate() {
    await fetch(`/api/platform/tenants/${tenant.id}/impersonate`, { method: "POST" })
    router.push(`/${tenant.slug}/admin`)
  }

  async function handleToggleEnabled() {
    await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tenant.enabled }),
    })
    router.refresh()
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{tenant.name}</p>
        <p className="text-gray-500 text-xs mt-1">
          <code className="text-gray-400">/{tenant.slug}/admin</code> ·{" "}
          {tenant._count.events} events · {tenant.photoCount} photos ·{" "}
          <span className={tenant.enabled ? "text-green-400" : "text-gray-600"}>
            {tenant.enabled ? "Active" : "Disabled"}
          </span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {tenant.enabled && (
          <Button variant="secondary" className="text-xs py-1.5 text-yellow-400 border-yellow-800" onClick={handleImpersonate}>
            Impersonate
          </Button>
        )}
        <Button
          variant={tenant.enabled ? "danger" : "secondary"}
          className="text-xs py-1.5"
          onClick={handleToggleEnabled}
        >
          {tenant.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write platform admin dashboard page**

```tsx
// app/(platform-admin)/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { TenantRow } from "@/components/platform/TenantRow"

export default async function PlatformAdmin() {
  const session = await auth()
  if (session?.user.role !== "platform_admin") redirect("/admin/login")

  const tenants = await db.tenant.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: { createdAt: "desc" },
  })

  const tenantsWithPhotos = await Promise.all(
    tenants.map(async (tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      enabled: tenant.enabled,
      createdAt: tenant.createdAt,
      _count: tenant._count,
      photoCount: await db.photo.count({
        where: { qrCode: { event: { tenantId: tenant.id } } },
      }),
    }))
  )

  const totalEvents = tenants.reduce((sum, t) => sum + t._count.events, 0)
  const totalPhotos = tenantsWithPhotos.reduce((sum, t) => sum + t.photoCount, 0)

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Platform Admin</h1>
        <p className="text-gray-500 text-sm">MomentCap</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Tenants", value: tenants.length },
          { label: "Events", value: totalEvents },
          { label: "Photos", value: totalPhotos },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tenants</h2>
      </div>

      <div className="flex flex-col gap-3">
        {tenantsWithPhotos.map((tenant) => (
          <TenantRow key={tenant.id} tenant={tenant} />
        ))}
        {tenants.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No tenants yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write create tenant page**

```tsx
// app/(platform-admin)/admin/tenants/new/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function NewTenant() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", slug: "", email: "", password: "" })
  const [error, setError] = useState("")

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    router.push("/admin")
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">New Tenant</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          { label: "Name", key: "name" as const, type: "text", onChange: (v: string) => handleNameChange(v) },
          { label: "Slug", key: "slug" as const, type: "text", onChange: (v: string) => setForm((p) => ({ ...p, slug: v })) },
          { label: "Email", key: "email" as const, type: "email", onChange: (v: string) => setForm((p) => ({ ...p, email: v })) },
          { label: "Password", key: "password" as const, type: "password", onChange: (v: string) => setForm((p) => ({ ...p, password: v })) },
        ].map(({ label, key, type, onChange }) => (
          <div key={key}>
            <label className="text-gray-400 text-xs uppercase tracking-wide">{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => onChange(e.target.value)}
              required
              className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm"
            />
          </div>
        ))}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit">Create Tenant</Button>
      </form>
    </div>
  )
}
```

Add the link from the platform admin dashboard by updating the "Tenants" header:

```tsx
// In app/(platform-admin)/admin/page.tsx — update the tenants header section:
import Link from "next/link"

// Replace:
// <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tenants</h2>
// With:
<div className="flex items-center justify-between mb-4">
  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tenants</h2>
  <Link href="/admin/tenants/new">
    <Button variant="secondary" className="text-xs py-1.5">+ New Tenant</Button>
  </Link>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add app/api/platform/ components/platform/TenantRow.tsx app/\(platform-admin\)/
git commit -m "feat: add platform admin tenant management"
```

---

## Task 10: Impersonation

**Files:**
- Create: `app/api/platform/tenants/[tenantId]/impersonate/route.ts`
- Create: `components/platform/ImpersonationBanner.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write impersonation API route**

```typescript
// app/api/platform/tenants/[tenantId]/impersonate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenant = await db.tenant.findUnique({ where: { id: params.tenantId } })
  if (!tenant || !tenant.enabled) {
    return NextResponse.json({ error: "Tenant not found or disabled" }, { status: 404 })
  }

  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "impersonate_start",
      metadata: JSON.stringify({
        adminEmail: session.user.email,
        startedAt: new Date().toISOString(),
      }),
    },
  })

  await unstable_update({ impersonatingAs: tenant.id, impersonatingSlug: tenant.slug })

  return NextResponse.json({ ok: true, tenantSlug: tenant.slug })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.impersonatingAs) {
    await db.auditLog.create({
      data: {
        tenantId: session.user.impersonatingAs,
        action: "impersonate_end",
        metadata: JSON.stringify({
          adminEmail: session.user.email,
          endedAt: new Date().toISOString(),
        }),
      },
    })

    await unstable_update({ impersonatingAs: null, impersonatingSlug: null })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write components/platform/ImpersonationBanner.tsx**

```tsx
// components/platform/ImpersonationBanner.tsx
"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export function ImpersonationBanner({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter()

  async function handleExit() {
    await fetch("/api/platform/tenants/impersonate", { method: "DELETE" })
    router.push("/admin")
  }

  return (
    <div className="w-full bg-yellow-950 border-b border-yellow-800 px-4 py-2 flex items-center justify-between gap-4">
      <p className="text-yellow-300 text-sm">
        <strong>Impersonating:</strong> {tenantSlug} — you are acting as this tenant&apos;s admin
      </p>
      <Button
        variant="secondary"
        className="text-xs py-1 border-yellow-700 text-yellow-300 shrink-0"
        onClick={handleExit}
      >
        Exit Impersonation
      </Button>
    </div>
  )
}
```

Note: the DELETE endpoint path needs to be `/api/platform/tenants/impersonate` for the banner's exit call. Add this route:

```typescript
// app/api/platform/tenants/impersonate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.impersonatingAs) {
    await db.auditLog.create({
      data: {
        tenantId: session.user.impersonatingAs,
        action: "impersonate_end",
        metadata: JSON.stringify({
          adminEmail: session.user.email,
          endedAt: new Date().toISOString(),
        }),
      },
    })
    await unstable_update({ impersonatingAs: null, impersonatingSlug: null })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Add ImpersonationBanner to tenant admin layout**

Create `app/(tenant-admin)/layout.tsx`:

```tsx
// app/(tenant-admin)/layout.tsx
import { auth } from "@/lib/auth"
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner"

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <>
      {session?.user.role === "platform_admin" && session.user.impersonatingSlug && (
        <ImpersonationBanner tenantSlug={session.user.impersonatingSlug} />
      )}
      {children}
    </>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/platform/tenants/impersonate/ components/platform/ImpersonationBanner.tsx app/\(tenant-admin\)/layout.tsx
git commit -m "feat: add platform admin impersonation with audit logging"
```

---

## Task 11: Dockerfile and Deployment

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Create: `docs/deployment.md`
- Create: `guides/getting-started.md`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/uploads /app/prisma && chown -R nextjs:nodejs /app/uploads /app/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

- [ ] **Step 2: Write .dockerignore**

```
node_modules
.next
.git
uploads
prisma/*.db
prisma/*.db-shm
prisma/*.db-wal
.env
.env.local
.superpowers
docs
```

- [ ] **Step 3: Write docker-compose.yml for local development**

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - uploads:/app/uploads
      - db:/app/prisma
    environment:
      DATABASE_URL: "file:/app/prisma/prod.db"
      NEXTAUTH_SECRET: "local-dev-secret-change-in-production"
      NEXTAUTH_URL: "http://localhost:3000"
      PLATFORM_ADMIN_EMAIL: "admin@momentcap.app"
      PLATFORM_ADMIN_PASSWORD: "changeme"

volumes:
  uploads:
  db:
```

- [ ] **Step 4: Test Docker build locally**

```bash
docker build -t momentcap:local .
```

Expected: Build completes successfully. If there are errors, fix them before proceeding.

- [ ] **Step 5: Write docs/deployment.md**

```markdown
# Deployment Guide

MomentCap is deployed as a single Docker container via Coolify.

## Prerequisites

- Coolify instance (coria or blackpear)
- GitHub repo: jonny190/momentcap
- A domain configured with Cloudflare tunnel

## Initial Coolify Setup

1. In Coolify, create a new Application
2. Select GitHub as the source and connect the jonny190/momentcap repo
3. Set the branch to `main`
4. Set the build pack to Dockerfile
5. Configure the following environment variables:

| Variable | Description |
|----------|-------------|
| NEXTAUTH_SECRET | Random 32+ character string |
| NEXTAUTH_URL | Full public URL, e.g. https://momentcap.daveys.xyz |
| PLATFORM_ADMIN_EMAIL | Your admin email |
| PLATFORM_ADMIN_PASSWORD | Your admin password |
| DATABASE_URL | file:/app/prisma/prod.db |

6. Add two persistent volumes:
   - Source: volume name `momentcap-uploads`, Destination: `/app/uploads`
   - Source: volume name `momentcap-db`, Destination: `/app/prisma`

7. Set the domain to your domain (HTTP - Cloudflare handles HTTPS)
8. Deploy

## Updating

Push to the `main` branch. Coolify auto-deploys on push.
```

- [ ] **Step 6: Write guides/getting-started.md**

```markdown
# Getting Started with MomentCap

This guide covers how to set up your first event and get QR codes ready for your guests.

## Logging in

Go to your MomentCap URL and navigate to /[your-slug]/admin. Enter the email and password your platform administrator provided.

## Creating an event

From your dashboard, click New Event and give it a name. The event will be created as active straight away.

## Setting up QR codes

Open your event and click Add Code. You can create:

- A primary code for general use at the event
- Named codes for specific locations, such as Ceremony or Reception

Each code is downloaded as a PNG image you can print and place at your venue.

## Viewing and downloading photos

Photos appear in your gallery as guests take them. You can view individual photos or download the full collection as a ZIP file from the event page.

## Ending an event

Once your event is over, you can mark it as ended from the event settings. The QR codes will stop accepting new photos, but your gallery and downloads remain available.
```

- [ ] **Step 7: Run final test suite**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 8: Final commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml docs/ guides/
git commit -m "feat: add Dockerfile and deployment documentation"
```

- [ ] **Step 9: Push to GitHub**

```bash
git remote add origin https://github.com/jonny190/momentcap.git
git push -u origin main
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Next.js scaffold, Vitest, PWA manifest |
| 2 | SQLite schema via Prisma |
| 3 | NextAuth.js for platform admin and tenant admin login |
| 4 | Zero-friction guest capture page with auto camera trigger |
| 5 | Photo upload API with local disk storage |
| 6 | Tenant admin - event management |
| 7 | QR code generation and PNG download |
| 8 | Photo gallery, individual download, ZIP download |
| 9 | Platform admin - tenant management |
| 10 | Platform admin impersonation with amber banner and audit log |
| 11 | Dockerfile, docker-compose, Coolify deployment docs |
