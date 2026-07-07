# Production Deployment

This guide prepares Verity Lens for a production-style Docker deployment while keeping the existing local development workflow unchanged.

## What is included

- `Dockerfile.backend` for the Express and Python ML runtime
- `Dockerfile.frontend` for the Vite production build served by Nginx
- `docker-compose.yml` for automatic startup and service orchestration
- Nginx reverse proxy for:
  - serving the React SPA
  - proxying `/api/*` requests to the backend
  - SPA fallback routing
- container health checks
- GitHub Actions CI for linting, building, and Docker validation

## Files

- `Dockerfile.backend`
- `Dockerfile.frontend`
- `docker-compose.yml`
- `nginx/default.conf`
- `.env.production.example`
- `.github/workflows/ci.yml`

## Environment variables

Start from the production example:

```bash
cp .env.production.example .env.production
```

Important variables:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=4000`
- `FRONTEND_PORT=8080`
- `CORS_ORIGIN=https://your-domain.example`
- `PYTHON_BIN=python3`
- `DB_CLIENT=json`

The trust-score, evidence, and ML tuning variables from `.env.example` are also supported in production.

## Run with Docker Compose

### Build and start

```bash
docker compose --env-file .env.production up -d --build
```

### Stop

```bash
docker compose --env-file .env.production down
```

### View logs

```bash
docker compose --env-file .env.production logs -f
```

## Service layout

- `frontend`
  - Nginx container
  - exposes `${FRONTEND_PORT}:80`
  - serves the built React app
  - proxies `/api/*` to the backend container
- `backend`
  - Node.js container with Python installed
  - runs `backend/server.js`
  - uses the same ML scripts and model artifacts as local development

## Health checks

### Frontend

- Container health check: `GET /healthz`
- Manual check:

```bash
curl http://localhost:8080/healthz
```

### Backend

- Container health check: `GET /api/health`
- Manual check:

```bash
curl http://localhost:8080/api/health
```

Because Nginx proxies `/api`, you can test backend health through the public frontend port.

## Production build details

### Frontend

- built with `npm run build`
- served from Nginx
- SPA routing is handled by `try_files ... /index.html`

### Backend

- installs production Node dependencies
- installs Python requirements from `requirements.txt`
- ships the existing `backend/models` artifacts and data files

## Persistence

The compose file mounts:

- `./backend/database.json`
- `./backend/data`
- `./backend/models`

That keeps saved analyses, app configuration, source reputation data, and model artifacts available across restarts.

## Reverse proxy behavior

`nginx/default.conf` provides:

- `/` -> static frontend assets
- `/api/` -> backend service
- `/healthz` -> Nginx health probe

## CI workflow

GitHub Actions runs:

- `npm ci`
- `pip install -r requirements.txt`
- `npm run lint`
- `npm run build`
- `python -m compileall ml`
- `docker compose config`
- Docker image builds for frontend and backend

## Local development remains unchanged

Use the existing commands:

```bash
npm run dev
npm run backend
npm run build
```

The Vite dev server still proxies `/api` to `http://localhost:4000`.
