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
  beforeEach(() => {
    vi.mocked(db.photo.create).mockResolvedValue({} as any)
  })

  it("returns 404 for unknown token", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue(null)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/bad-token", {
      method: "POST",
      body: form,
    })
    const res = await POST(req, { params: Promise.resolve({ token: "bad-token" }) })
    expect(res.status).toBe(404)
  })

  it("returns 404 when event is inactive", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue({
      id: "qr1", token: "t", label: null, eventId: "ev1", createdAt: new Date(),
      event: { id: "ev1", active: false, tenant: { slug: "daveys", enabled: true }, slug: "wedding" },
    } as any)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/t", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ token: "t" }) })
    expect(res.status).toBe(404)
  })

  it("returns 404 when tenant is disabled", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue({
      id: "qr1", token: "t", label: null, eventId: "ev1", createdAt: new Date(),
      event: { id: "ev1", active: true, tenant: { slug: "daveys", enabled: false }, slug: "wedding" },
    } as any)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/t", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ token: "t" }) })
    expect(res.status).toBe(404)
  })

  it("returns 400 when no photo field in form data", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue({
      id: "qr1", token: "t", label: null, eventId: "ev1", createdAt: new Date(),
      event: { id: "ev1", active: true, tenant: { slug: "daveys", enabled: true }, slug: "wedding" },
    } as any)
    const req = new NextRequest("http://localhost/api/upload/t", { method: "POST", body: new FormData() })
    const res = await POST(req, { params: Promise.resolve({ token: "t" }) })
    expect(res.status).toBe(400)
  })

  it("returns 200 and creates photo record for valid token", async () => {
    vi.mocked(db.qRCode.findUnique).mockResolvedValue({
      id: "qr1",
      token: "valid",
      label: null,
      eventId: "ev1",
      createdAt: new Date(),
      event: { id: "ev1", active: true, tenant: { slug: "daveys", enabled: true }, slug: "wedding" },
    } as any)
    const form = new FormData()
    form.append("photo", new File(["img"], "p.jpg", { type: "image/jpeg" }))
    const req = new NextRequest("http://localhost/api/upload/valid", {
      method: "POST",
      body: form,
    })
    const res = await POST(req, { params: Promise.resolve({ token: "valid" }) })
    expect(res.status).toBe(200)
    expect(db.photo.create).toHaveBeenCalledWith({
      data: { qrCodeId: "qr1", filename: "daveys/wedding/123-abc.jpg" },
    })
  })
})
