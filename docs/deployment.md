# Deployment

MomentCap ships as a single Docker image. Everything it stores goes in `/data`, so the only thing to set up is one persistent volume mapped there.

## Coolify

1. Create a new application from the Git repository and pick the **Dockerfile** build pack.
2. Set the port to `3000`.
3. Under **Persistent Storage**, add a volume:
   - Name: `momentcap-data`
   - Destination path: `/data`
4. Add the environment variables below.
5. Set the domain as plain `http://` (the Cloudflare tunnel takes care of HTTPS).
6. Deploy.

The container fixes ownership of `/data` on start, so a named volume and a host folder both work.

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `ADMIN_PASSWORD` | Yes | Password for `/admin`. Sign-in is switched off if this isn't set. |
| `SESSION_SECRET` | Recommended | Long random string for signing the admin cookie (`openssl rand -hex 32`). |
| `PUBLIC_URL` | Recommended | The public address, e.g. `https://moments.example.com`. Used in the QR code. Without it, the address is worked out from the request headers. |
| `MAX_PHOTO_MB` | No | Largest photo accepted. Defaults to 40. |
| `MAX_VIDEO_MB` | No | Largest video accepted. Defaults to 1024. |
| `DATA_DIR` | No | Already `/data` in the image. |

### Health check

`GET /api/health` returns `{"ok":true}` once the database opens. The image has a Docker `HEALTHCHECK` built in.

## Cloudflare

Uploads are sent in 8 MB chunks, so the 100 MB request limit on Cloudflare's free plan never comes into it. Nothing else needs changing.

## Backups

Back up the whole `/data` volume. The database runs in WAL mode, so for a fully consistent copy, either stop the container first or copy `momentcap.db`, `momentcap.db-wal` and `momentcap.db-shm` together.

## Running locally with Docker

```bash
ADMIN_PASSWORD=secret docker compose up --build
```

Then open http://localhost:3000/admin.

## Resource notes

Video previews are encoded with ffmpeg inside the container, two jobs at a time. A one-minute phone clip takes a few seconds of CPU on a typical server. Photos are much cheaper. If the server is small and the event is video-heavy, previews may take a little while to show up, but uploads themselves are never held up by this.
