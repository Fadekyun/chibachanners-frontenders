# Docker deployment

This repository is a Next.js standalone server. It exposes the frontend on host port `8090`.

The initial deployment goal is to keep the frontend container running and automatically rebuild it whenever `main` changes. The attendee-data integration will be added separately after the bot container's real token and data-sharing contract are confirmed.

## Automatic deployment is included

The repository includes `.github/workflows/deploy.yml`.

Every push to `main` automatically:

1. checks out the latest frontend code on the self-hosted deployment runner;
2. runs `docker compose up -d --build --remove-orphans`;
3. verifies `http://127.0.0.1:8090/api/health`;
4. removes dangling Docker images after a successful deployment.

The workflow can also be started manually from the GitHub Actions tab using **Run workflow**.

## One-time deployment setup

The deployment host needs a GitHub Actions self-hosted runner registered for this frontend repository. Use these runner labels:

```text
self-hosted
linux
```

The runner should be installed on the actual host that will run the frontend container. It does not need to be a Raspberry Pi or use a specific CPU architecture.

The runner user must be allowed to run:

```bash
docker compose version
curl --version
```

## First deployment

After the runner is ready, open:

```text
GitHub repository → Actions → Deploy frontend → Run workflow
```

The workflow builds and starts the container automatically.

The frontend will be available at:

```text
http://<deployment-host>:8090
```

## Docker Compose configuration

The repository includes `docker-compose.yml`:

```yaml
services:
  chibachanners-frontend:
    build: .
    container_name: chibachanners-frontend
    restart: unless-stopped
    ports:
      - "8090:8090"
```

## Updating after a frontend code change

Push the update to `main`:

```bash
git add .
git commit -m "Describe the frontend change"
git push origin main
```

The GitHub Actions workflow rebuilds and recreates the frontend container automatically.

A manual host-side fallback remains available:

```bash
git clone https://github.com/Fadekyun/chibachanners-frontenders.git
cd chibachanners-frontenders

docker compose up -d --build
```

## Health check

```bash
curl --fail http://127.0.0.1:8090/api/health
```

Expected response:

```json
{"status":"ok"}
```

## Later bot integration

The bot currently stores its live JSON under its own deployment volume. If the frontend later reads those files directly, the deployment host must mount the same underlying host folder or Docker volume into both containers:

```text
bot container       → /app/data          (read-write)
frontend container  → /app/offkai-data   (read-only)
```

If the bot data is not available as a shared host folder or shared Docker volume, use an internal API instead.

This data-sharing step is intentionally not part of the initial rollout.

## Current attendee-route status

The container and health endpoint are ready for deployment.

The attendee route intentionally returns a placeholder response until the bot's real personal-link and data-sharing contract are confirmed.

## Remaining packaging follow-up

Commit a generated `package-lock.json` after running `npm install`. The current Dockerfile can build without it, but a lockfile makes dependency installation reproducible and allows the Docker build to use `npm ci`.
