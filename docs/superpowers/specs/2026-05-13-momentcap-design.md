# MomentCap Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Overview

MomentCap is a multi-tenant photo capture platform for events such as weddings and parties. Guests scan a QR code, their phone camera opens instantly, they take a photo, and it uploads immediately with no login, no prompts, and no friction. Event organisers (tenants) manage their events, QR codes, and photo galleries through a private admin panel. A platform super-admin manages all tenants.

## Architecture

**Stack:** Next.js 14 App Router, SQLite via Prisma, local disk storage (volume-mounted), NextAuth.js for authentication.

**Deployment:** Single Docker container on Coolify, connected to GitHub repo `jonny190/momentcap`. Photos are stored on a persistent volume mount so they survive container restarts and redeployments.

**Tenant isolation:** Each tenant has a slug (e.g. `bloom`) that forms the base of their admin URL. All tenant data is scoped by tenant ID in the database.

## URL Structure

| Path | Purpose |
|------|---------|
| `/admin` | Platform super-admin login and panel |
| `/[tenant]/admin` | Tenant admin login and panel |
| `/c/[token]` | Guest capture page (no auth, opens camera) |

## User Roles

### Platform Admin (super-admin)
- Single account, credentials set via environment variable at deploy time
- Creates and manages tenant accounts (name, slug, email, password)
- Views platform-wide stats (tenant count, event count, total photos)
- Can disable/enable tenants without deleting their data
- Can impersonate any tenant - session is preserved, impersonation token issued, amber banner shown at all times, exit returns to platform admin, all impersonation sessions are audit-logged

### Tenant Admin
- Created by platform admin with email and initial password
- Logs in at `/[tenant]/admin`
- Creates events (name, slug, active/ended status)
- Generates QR codes per event: one primary code plus any number of named sub-codes (e.g. "Ceremony", "Reception")
- Views photo gallery for each event, filtered by QR code if desired
- Downloads individual photos or full event ZIP

### Guest (unauthenticated)
- Scans a QR code printed at the venue
- Browser opens `/c/[token]` - no login, no prompt
- Camera launches immediately (see Capture Flow)
- Takes a photo, it uploads automatically
- Page resets and camera re-opens for the next photo
- Can close the browser at any time - no state to lose

## Capture Flow

The capture page is designed for zero friction on mobile:

1. Page loads at `/c/[token]` and resolves the token to an active event and QR code record
2. A hidden `<input type="file" accept="image/*" capture="environment">` is auto-triggered via JavaScript on page load
3. The phone's native rear camera opens (no browser permission dialog - uses the native file input, not getUserMedia)
4. Guest takes the photo and confirms in the native camera UI
5. File selection triggers an automatic upload to `POST /api/upload/[token]` - no submit button
6. A brief upload indicator is shown while the photo transfers
7. On success the page resets and re-triggers the camera input, ready for another photo
8. If the token is invalid or the event is inactive, a simple "This event has ended" message is shown

**PWA configuration:** The capture page uses a PWA manifest with `display: standalone` plus iOS-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-fullscreen`) to strip the browser chrome entirely. Guests see a fullscreen camera experience with no address bar or navigation buttons.

## Data Model

```
Tenant
  id, name, slug, email, passwordHash, enabled, createdAt

Event
  id, tenantId, name, slug, active, createdAt

QRCode
  id, eventId, label, token (unique random string), createdAt
  label is null for the primary code, a string for named codes

Photo
  id, qrCodeId, filename, uploadedAt
  filename is the path on disk relative to the uploads volume root
```

Photos are stored at `uploads/[tenantSlug]/[eventSlug]/[timestamp]-[random].[ext]`.

## Key API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/upload/[token]` | None | Guest photo upload |
| GET | `/api/admin/events` | Tenant | List events |
| POST | `/api/admin/events` | Tenant | Create event |
| GET | `/api/admin/events/[id]/qrcodes` | Tenant | List QR codes for event |
| POST | `/api/admin/events/[id]/qrcodes` | Tenant | Create QR code |
| GET | `/api/admin/events/[id]/photos` | Tenant | List photos |
| GET | `/api/admin/events/[id]/download` | Tenant | Download ZIP of all event photos |
| GET | `/api/admin/photos/[id]/download` | Tenant | Download single photo |
| GET | `/api/platform/tenants` | Platform Admin | List all tenants |
| POST | `/api/platform/tenants` | Platform Admin | Create tenant |
| PATCH | `/api/platform/tenants/[id]` | Platform Admin | Edit or disable tenant |
| POST | `/api/platform/tenants/[id]/impersonate` | Platform Admin | Start impersonation session |
| DELETE | `/api/platform/impersonate` | Platform Admin | End impersonation session |

## Authentication

NextAuth.js handles all authentication with credentials provider (email + password, bcrypt hashed).

- Platform admin session is distinguished by a `role: "platform_admin"` field on the session token
- Tenant admin sessions carry `role: "tenant_admin"` and `tenantId`
- Impersonation works by storing `impersonatingAs: tenantId` in the platform admin's session - the server checks this when rendering tenant admin pages and uses the tenant's data scope
- All impersonation events are written to an `AuditLog` table (who, which tenant, start/end timestamps)

## Tenant Admin Panel

- Sidebar with: Events, Gallery, Downloads, Settings
- Events list shows name, status (active/ended), QR code count, photo count
- QR code panel shows primary code and named codes as downloadable images (using the `qrcode` npm package to render to PNG)
- Gallery shows a photo grid; click opens full size with individual download option
- "Download All (ZIP)" button streams a ZIP of all event photos via the `archiver` package

## Platform Admin Panel

- Stats bar: tenant count, event count, total photos
- Tenant table: name, login URL, event count, photo count, status
- Actions per row: Impersonate, Edit, Enable/Disable
- Create Tenant form: name, slug (auto-suggested from name), email, temporary password
- Impersonation banner: amber bar pinned to top of page showing tenant name and "Exit Impersonation" button - cannot be dismissed

## Deployment

- `Dockerfile` at repo root - multi-stage build, Next.js standalone output
- Coolify deployment connected to `jonny190/momentcap` on GitHub
- Volume mount at `/app/uploads` for photo storage
- Volume mount at `/app/prisma` for SQLite database file
- Environment variables: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`
- Domains configured as HTTP with Cloudflare tunnel proxy for HTTPS (per Coolify/coria setup)

## Project Structure

```
momentcap/
  app/
    (platform-admin)/admin/     - platform admin pages
    (tenant-admin)/[tenant]/admin/  - tenant admin pages
    c/[token]/                  - guest capture page
    api/                        - API routes
  components/                   - shared UI components
  lib/
    auth.ts                     - NextAuth config
    db.ts                       - Prisma client
    zip.ts                      - ZIP generation helper
  prisma/
    schema.prisma
  public/
    manifest.json               - PWA manifest
  uploads/                      - photo storage (volume-mounted)
  docs/                         - documentation
  guides/                       - user guides
  Dockerfile
```

## Out of Scope

- Guest-facing photo gallery or sharing
- Self-service tenant signup
- External/cloud object storage (S3, R2)
- Email notifications
- Photo editing or moderation
