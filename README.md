# MomentCap

MomentCap is a shared camera for a single event. Guests scan a QR code, the page opens with a big shutter button, and every photo or video they take goes straight into one album. There's no app to install and nobody has to sign up.

The organiser has a small admin area where they can name the event, print a QR sign, look through everything that comes in, hide anything they'd rather guests didn't see, and download the lot as a ZIP.

## Quick start

```bash
cp .env.example .env.local   # set ADMIN_PASSWORD
npm install
npm run dev
```

Open http://localhost:3000/admin, sign in, and the overview page shows the guest QR code and link.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` | Production build (standalone output) |
| `npm start` | Run the production build |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

## Where things live

- `src/app` holds routes only. Pages and API handlers stay thin and call into modules.
- `src/modules` holds the actual logic, split by area (core, event, auth, media, uploads, guest, admin).
- `docs/` has the technical documentation, `guides/` has the user guides.

More detail is in [docs/architecture.md](docs/architecture.md) and [docs/deployment.md](docs/deployment.md).

Powered by [Coria](https://coria.ai).
