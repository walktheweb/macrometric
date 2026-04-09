# MacroMetric

MacroMetric now has two supported local workflows:

- `Fast dev`: frontend and API run on your machine, Postgres stays in Docker
- `Production-like test`: frontend, API, Postgres, and Caddy all run in Docker

The production-like Docker stack remains the release path for Raspberry Pi. The fast dev lane is for daily coding and debugging.

## Requirements

- Node.js 20+
- npm
- Docker Desktop

## Fast Dev

This is the recommended daily development workflow.

### 1. Create local env files

Copy the examples:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item .env.api.local.example .env.api.local
```

These defaults point the frontend to `http://localhost:3000/api` and the API to the Docker Postgres instance on `localhost:5432`.
For local dev, the frontend now uses Vite's `/api` proxy to the local API on `127.0.0.1:3000`, so browser auth and cookies behave like a same-origin app.

### 2. Start only Postgres in Docker

```powershell
npm run dev:db
```

This uses `docker-compose.yml` plus `docker-compose.dev.yml`, which publishes Postgres on `localhost:5432` without changing the normal full-stack Docker flow.

### 3. Run the API locally

```powershell
npm run dev:api
```

API endpoints:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/openapi.json`
- `http://localhost:3000/api/docs`

### 4. Run the frontend locally

In a second terminal:

```powershell
npm run dev
```

Open:

- `http://localhost:5173`

### 5. Stop the dev database

```powershell
npm run dev:db:down
```

## Production-Like Docker Test

Use this when validating a release candidate or rehearsing the Raspberry Pi deployment:

```powershell
docker compose up -d --build
```

Open:

- `http://localhost/`
- `http://localhost/api/health`
- `http://localhost/api/docs/`

Stop it with:

```powershell
docker compose down
```

## Pi Files Access

The production Pi stack can also expose a browser-based file manager at `/files`.

- `backups/` is mounted read-only from the Pi host backup directory
- `shared/` is mounted read/write for normal file exchange

For production on the Pi, set at least:

```env
FILEBROWSER_ADMIN_USERNAME=admin
FILEBROWSER_ADMIN_PASSWORD=your-strong-password
```

## Data Notes

Fast dev reuses the same Docker Postgres service definition and schema as the production-like stack, but it connects through `localhost:5432`.

By default, this setup reuses the existing Postgres volume. That is convenient and fast, but it also means:

- fast dev and Docker test can see the same database state
- test imports or edits can affect the shared local data

If you later want a stricter separation, the next step would be a dedicated dev database name or dev-only volume. That is not required for this first fast-dev setup.

## Useful Commands

```powershell
npm install
npm run dev:db
npm run dev:api
npm run dev
docker compose up -d --build
docker compose down
```
