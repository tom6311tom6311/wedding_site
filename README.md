# Wedding Site

A full-stack wedding invitation site with RSVP collection, photo puzzle progress, background music, and a password-protected admin dashboard.

The repository is a TypeScript npm workspace with:

- `apps/web`: React + Vite frontend served by Nginx in production.
- `apps/api`: Fastify API backed by PostgreSQL.
- `docker-compose.yml`: local development stack with PostgreSQL, API, and Vite.
- `docker-compose.prod.yml`: production stack for web/API containers using an external PostgreSQL database such as RDS.

## Features

- Wedding invitation landing page with hero carousel, countdown, story, couple, schedule, venue, RSVP, and puzzle sections.
- RSVP form with browser-token persistence so guests can update their existing response.
- Puzzle unlock flow tied to RSVP identity.
- Admin page at `/admin` with password login, persisted admin token, RSVP dashboard, RSVP CSV export, editable/deletable RSVP records, puzzle progress, and recent activity.
- PostgreSQL migrations run automatically on API startup.
- Production Nginx proxy for `/api/*` and `/health`.
- Static asset optimization, including WebP images, long-lived static cache headers, and a subsetted CJK display font.

## Requirements

- Node.js 22 or compatible modern Node.js runtime.
- npm.
- Docker and Docker Compose for the local full stack or production containers.
- PostgreSQL 16 for local Docker development, or RDS/PostgreSQL for production.

## Project Structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── admin.ts
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── puzzle.ts
│   │   │   ├── rsvp.ts
│   │   │   └── server.ts
│   │   └── certs
│   └── web
│       ├── public
│       │   ├── audio
│       │   ├── fonts
│       │   └── images
│       ├── src
│       │   ├── components
│       │   └── content
│       └── scripts
├── docker-compose.yml
├── docker-compose.prod.yml
└── DEPLOYMENT.md
```

## Environment Files

Start from the examples:

```bash
cp .env.example .env
cp .env.production.example .env.production
```

Important local variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by the API. |
| `WEB_ORIGIN` | Allowed browser origin for API CORS. Usually `http://localhost:5173` locally. |
| `PHONE_HASH_SECRET` | Secret used when deriving phone hashes. Use a long random value. |
| `BROWSER_TOKEN_SECRET` | Secret used for guest browser tokens. Use a long random value. |
| `ADMIN_PASSWORD` | Password for `/admin`. |
| `ADMIN_TOKEN_SECRET` | Secret used for persistent admin login tokens. |
| `VITE_RSVP_API_BASE_URL` | Browser API base URL. Locally this is usually `http://localhost:4000`; in production it can be empty for same-origin `/api`. |

Generate secrets with:

```bash
openssl rand -hex 32
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the full local Docker stack:

```bash
docker compose --env-file .env up --build
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:4000/health`
- Admin page: `http://localhost:5173/admin`

For separate npm processes instead of the Docker web/API services, keep PostgreSQL available and run:

```bash
npm run dev:api
npm run dev:web
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the web dev server. |
| `npm run dev:web` | Start the web dev server. |
| `npm run dev:api` | Start the API dev server. |
| `npm run build` | Type-check/build all workspaces. |
| `npm run build:web` | Build the web app. |
| `npm run build:api` | Type-check the API. |
| `npm run preview` | Preview the built web app. |
| `npm run subset:font` | Regenerate the public subset font from site text. |

## Content Editing

Main site content lives in:

- `apps/web/src/content/wedding.json`
- `apps/web/src/content/wedding.local.json`

The content files drive page text, RSVP/admin labels, hero/story/schedule/puzzle image lists, and localized UI strings. Prefer editing content JSON instead of hard-coding display text in components.

After changing visible text, regenerate the subset font so newly added Chinese characters are included:

```bash
npm run subset:font
npm run build
```

The full source font is kept at:

```text
apps/web/fonts/ChenYuluoyan-2.0-Thin.woff2
```

Only the generated subset in `apps/web/public/fonts` is served to visitors.

## Assets

Public static assets live under `apps/web/public`.

- `images`: photos and decorative images.
- `audio`: background music.
- `fonts`: served font subset and license.
- `robots.txt`: static crawler rules.

Production Nginx sets two-week immutable cache headers for static assets in `apps/web/nginx.conf`. Vite-built JS/CSS filenames are hashed, so updates produce new asset URLs.

Puzzle images can remain as downloadable JPGs. They are not preloaded by the app and are fetched when puzzle UI or unlocked photo views render them.

## API

The API exposes:

- `GET /health`
- `POST /api/rsvp`
- `GET /api/rsvp/me`
- `POST /api/rsvp/lookup`
- `GET /api/puzzle/me`
- `POST /api/puzzle/identify`
- `POST /api/puzzle/unlocks`
- `POST /api/admin/login`
- `GET /api/admin/overview`
- `PATCH /api/admin/rsvps/:id`
- `DELETE /api/admin/rsvps/:id`

Tables are created/migrated automatically on API startup:

- `rsvp_responses`
- `photo_unlocks`

Puzzle unlocks reference RSVP rows with `ON DELETE CASCADE`, so deleting an RSVP also removes that guest's puzzle records.

## Admin Page

Open:

```text
/admin
```

Admin capabilities:

- Summary dashboard.
- RSVP table/cards with sorting.
- CSV export.
- Edit and delete RSVP responses.
- Puzzle progress dashboard.
- Recent activity feed.

Login uses `ADMIN_PASSWORD`. The admin token is stored in the browser so the admin does not need to re-enter the password every visit.

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Lightsail + RDS deployment guide.

The production Compose file runs:

- `web`: Nginx serving built frontend files and proxying `/api` to the API container.
- `api`: Fastify API container.

It intentionally does not run PostgreSQL. Use RDS or another managed PostgreSQL database for durable production data.

Build and start production containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

## Database Operations

Local PostgreSQL data is stored in the Docker volume `wedding-postgres-data`.

To recreate the local database volume:

```bash
docker compose --env-file .env down -v
docker compose --env-file .env up --build
```

For production, rely on RDS automated backups. Use `pg_dump` for manual exports.

## Notes

- Do not commit real `.env` or `.env.production` files.
- Keep production `VITE_RSVP_API_BASE_URL` empty when serving API and frontend from the same domain through Nginx.
- If using RDS with certificate verification, set `DATABASE_SSL_CA_FILE` to the mounted AWS RDS CA bundle path and keep `DATABASE_SSL_REJECT_UNAUTHORIZED=true`.
- Re-run `npm run subset:font` whenever text content changes enough to introduce new glyphs.
