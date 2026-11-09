# Architecture

MomentCap 2 is a single Next.js 16 app that runs in one container. It hosts exactly one event. All state, meaning the SQLite database, the original files and the generated previews, lives in one directory (`DATA_DIR`, which is `/data` in Docker) so that a single mapped volume is enough to keep everything.

## Why it looks like this

The first version was multi-tenant, with NextAuth, tenants, impersonation and several QR codes per event. None of that was needed, and the camera auto-open it relied on doesn't work on phones (browsers only open the camera from a real tap). Version 2 was rebuilt from scratch around three goals:

1. The least possible friction for guests.
2. Nothing lost on bad venue wifi.
3. Simple to run: one container, one volume.

## Modules

Code is split into modules under `src/modules`. Routes in `src/app` stay thin and call into them, so a change usually only touches one module.

| Module | Responsibility |
|--------|----------------|
| `core` | Config and paths, the SQLite connection and migrations, rate limiting, HTTP helpers, public URL detection |
| `event` | The single event's settings (name, message, guest link, uploads and album switches) and QR code rendering |
| `auth` | The admin password check and signed session cookie |
| `uploads` | Resumable chunked uploads: start, append chunk, complete |
| `media` | The media repository, file storage, preview processing, job queue, file serving with range support, ZIP export, and the shared gallery UI |
| `guest` | The guest-facing client code: capture screen, print stack, upload queue, offline store |
| `admin` | Server actions and admin UI pieces |

## Guest capture flow

1. A guest scans the QR code, which points at `/e/<token>`. The token is a random 16 character value stored on the event. Rotating it in the admin area kills old links.
2. The capture screen has three ways in: **Take a photo** (native camera, `capture="environment"`), **Video** (native video camera) and **Add photos you already took** (photo library, multiple selection).
3. The chosen files go into an `UploadQueue` (`src/modules/guest/upload-queue.ts`). Each file is also saved to IndexedDB first, so nothing is lost if the phone locks or the page closes. Anything left over gets resumed the next time the guest opens the link.
4. Uploads run one at a time, in 8 MB chunks:
   - `POST /api/guest/<token>/uploads` starts an upload and returns an id
   - `GET /api/guest/<token>/uploads/<id>` reports how many bytes the server already has
   - `PUT /api/guest/<token>/uploads/<id>?offset=N` appends a chunk of raw bytes
   - `POST /api/guest/<token>/uploads/<id>/complete` finishes it

   The size of the partial file on the server is the source of truth. If a chunk arrives at the wrong offset, the server answers 409 with the correct offset and the client carries on from there. Network errors back off exponentially (1s up to 30s) and retry forever. Coming back online or reopening the page cuts the wait short.
5. On completion the server checks the file's magic bytes, moves it into `media/originals`, records it, and queues preview processing.

Chunking exists for two reasons. Cloudflare rejects any single request over 100 MB, and phone videos often go past that. It also means a dropped connection only costs one chunk.

There's no `proxy.ts` (what used to be called middleware) on purpose. When a proxy is present, Next.js 16 buffers request bodies in memory, which would hurt large uploads.

## Previews

`src/modules/media/process.ts` builds the web copies. The original is never touched.

- **Photos:** sharp applies the EXIF rotation and writes a 2048px JPEG (`display`) and a 480px WebP (`thumb`). Metadata, including GPS, is not copied to these. HEIC files are converted with `heic-convert` (wasm) first, because prebuilt sharp can't decode HEVC.
- **Videos:** ffmpeg grabs a poster frame for the thumbnail and transcodes a 720p H.264 MP4 with faststart, so iPhone HEVC footage plays in every browser. If ffmpeg isn't installed, the video stays playable and downloadable as uploaded, just without a poster.

Jobs run in an in-process queue, two at a time. If the container restarts mid-job, `src/instrumentation.ts` re-queues anything still marked `processing` at boot.

## Storage layout

```
/data
  momentcap.db           SQLite (WAL mode)
  media/originals/       exactly what the phone sent
  media/display/         web-sized copies (jpg, mp4)
  media/thumbs/          webp thumbnails and video posters
  tmp/                   partial uploads, cleaned after 24 hours
```

Paths in the database are relative to `DATA_DIR`, so the volume can be moved or restored somewhere else.

## Database

Three tables, created by the ordered migration list in `src/modules/core/db.ts` (tracked with `PRAGMA user_version`; only ever append to that list):

- `event`: one row with the name, message, guest token and the two switches
- `media`: every photo and video, with status, guest name, device id, file paths and a hidden flag
- `upload`: in-progress chunked uploads

## Access rules

- **Guest pages and APIs** need the current guest token.
- **The album** (listing and viewing files) also needs the album switch turned on. Guests only see items that are ready and not hidden.
- **Guest names** are optional. They're kept in localStorage on the phone and attached to each upload.
- **A device id** (random, in localStorage) is attached to each upload so guests can remove their own shots. It's never sent back to other guests.
- **The admin** signs in with `ADMIN_PASSWORD`. The session is an HMAC-signed cookie that expires after 14 days. Without `SESSION_SECRET`, the signing key is derived from the password, so changing the password signs everyone out.
- **Rate limits:**
  - starting an upload: 1500 per IP and 200 per device per 10 minutes (venues often share one IP)
  - admin sign-in: 10 attempts per IP per 15 minutes
- **Disk space:** uploads are refused once free space on the volume would drop below 1 GB.

## Files and downloads

- `GET /api/media/<id>/<thumb|display|original>` serves files with HTTP range support, which Safari needs for video playback. Add `?download=1` to download.
- `GET /api/admin/download` streams a ZIP of every original. It's built on the fly, nothing is held in memory, and files are stored rather than recompressed. Entries are named like `photos/2026-06-14_19-32-05_Sam_ab12cd.jpg`.

## Testing

- `tests/units.test.ts` covers range parsing, file sniffing, export names and admin sessions.
- `tests/uploads.test.ts` runs the full chunked upload and photo processing path against a temporary data directory.
- `tests/video.test.ts` runs only when `TEST_VIDEO` points at a clip and ffmpeg is available (set `FFMPEG_PATH` and `FFPROBE_PATH` if they aren't on the PATH).
