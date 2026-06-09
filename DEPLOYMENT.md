# Docker deployment

This repository is a Next.js standalone server. It exposes the frontend on host port `8090` and mounts the bot JSON persistence directory read-only for later attendee integration.

The initial deployment goal is to keep the frontend container running and automatically rebuild it whenever `main` changes. The attendee token contract will be connected to the bot separately after its real format is confirmed.

## Automatic deployment is included

The repository includes `.github/workflows/deploy.yml`.

Every push to `main` automatically:

1. checks out the latest frontend code on the self-hosted deployment runner;
2. checks that the bot JSON directory and required files exist;
3. runs `docker compose up -d --build --remove-orphans`;
4. verifies `http://127.0.0.1:8090/api/health`;
5. removes dangling Docker images after a successful deployment.

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

The runner user must also be able to read the bot data directory.

## GitHub repository setting

Before the first deployment, configure this repository variable in:

```text
GitHub repository → Settings → Secrets and variables → Actions → Variables
```

Create:

```text
OFFKAI_DATA_DIR
```

Set it to the absolute host path of the bot repository's existing `./data` directory.

Example:

```text
/home/eyal/offkai-bot/data
```

That directory must contain:

```text
events.json
responses.json
```

No frontend secret is required for the initial deployment.

## First deployment

After the runner and repository variable are ready, open:

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
    environment:
      OFFKAI_EVENTS_FILE: /app/offkai-data/events.json
      OFFKAI_RESPONSES_FILE: /app/offkai-data/responses.json
      MOCK_MODE: "false"
    volumes:
      - ${OFFKAI_DATA_DIR}:/app/offkai-data:ro
```

The bot remains the only writer. The frontend mount is read-only.

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

export OFFKAI_DATA_DIR='/absolute/path/to/offkai-bot/data'

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

## Current attendee-route status

The container and health endpoint are ready for deployment.

The attendee route intentionally returns a placeholder response until the bot's real personal-link contract is confirmed. This avoids inventing a JWT secret or token format that the bot does not currently use.

## Remaining packaging follow-up

Commit a generated `package-lock.json` after running `npm install`. The current Dockerfile can build without it, but a lockfile makes dependency installation reproducible and allows the Docker build to use `npm ci`.
