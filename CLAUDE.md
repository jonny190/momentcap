@AGENTS.md

# MomentCap project notes

Single-event shared camera. Guests scan a QR code, shoot with the phone's native camera, and photos and videos upload to one album. There's one admin, who signs in with a password from an environment variable. Version 2 (November 2026) is a full rebuild. The old multi-tenant version is in git history before the `rebuild/single-event` branch.

## Stack

- Next.js 16.4 (App Router, Turbopack, standalone output), React 19.3, Tailwind 4
- better-sqlite3 with hand-written migrations in `src/modules/core/db.ts`. There's no ORM: append to the migrations array, never edit a shipped entry.
- sharp for photo previews, heic-convert for HEIC, ffmpeg (system binary) for video previews
- archiver 8 (`ZipArchive` class) for streamed ZIP downloads
- Vitest for tests

## Conventions

- Logic lives in `src/modules/<area>`. Routes in `src/app` stay thin.
- Everything persistent goes under `DATA_DIR` (`/data` in Docker), which is one Coolify volume.
- Pages that read SQLite without calling `cookies()` must `await connection()` first, or Next will prerender them at build time.
- There's deliberately no `proxy.ts`, because it would buffer upload bodies in memory.
- Guest UI tokens: plum night `#21182a`, print white, brass shutter `#d9ae55`. Gloock for the event name only, Albert Sans for everything else.
- Every page carries the "Powered by Coria" footer (`src/components/PoweredByCoria.tsx`), linking to https://coria.ai.
- Docs live in `docs/` and user guides in `guides/`. Keep them updated with code changes. No em dashes and no emojis in written material.

## Testing

`npm test` runs the unit and upload tests. Set `TEST_VIDEO`, `FFMPEG_PATH` and `FFPROBE_PATH` to include the video test. See `docs/architecture.md` for the full picture.
