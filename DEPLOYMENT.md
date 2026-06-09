# Docker deployment

This repository is a Next.js standalone server. It reads the bot's JSON persistence files through a read-only Docker volume mount and exposes the frontend on host port `8090`.

No internal HTTP API is required.

## Required bot files

The frontend reads:

```text
events.json
responses.json
```

The bot remains the only writer. The frontend mounts the data directory read-only and never modifies these files.

## Automatic deployment is included

The repository includes `.github/workflows/deploy.yml`.

Every push to `main` automatically:

1. checks out the latest frontend code on the self-hosted deployment runner;
2. checks that the required bot JSON files exist;
3. runs `docker compose up -d --build --remove-orphans`;
4. verifies `http://127.0.0.1:8090/api/health`;
5. removes dangling Docker images after a successful deployment.

The workflow can also be started manually from the GitHub Actions tab using **Run workflow**.

## One-time deployment setup

The deployment host needs a GitHub Actions self-hosted runner registered for this frontend repository. Use these runner labels:

```text
self-hosted
linux
arm64
pi-deploy
```

These labels match the existing Raspberry Pi deployment runner convention used by `offkai-bot`.

The runner user must be allowed to run:

```bash
docker compose version
curl --version
```

The runner user must also be able to read the bot data directory.

## GitHub repository settings

Before the first deployment, configure these settings in:

```text
GitHub repository → Settings → Secrets and variables → Actions
```

Create one repository secret:

```text
OFFKAI_JWT_SECRET
```

Use the same JWT secret already used by the bot when it generates personal attendee URLs.

Create one repository variable:

```text
OFFKAI_DATA_DIR
```

Set it to the absolute path of the bot data directory on the deployment host. That directory must contain:

```text
events.json
responses.json
```

Example:

```text
/home/eyal/offkai-bot/data
```

## First deployment

After the runner and repository settings are ready, open:

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
      OFFKAI_JWT_SECRET: ${OFFKAI_JWT_SECRET}
      OFFKAI_EVENTS_FILE: /app/offkai-data/events.json
      OFFKAI_RESPONSES_FILE: /app/offkai-data/responses.json
      MOCK_MODE: "false"
    volumes:
      - ${OFFKAI_DATA_DIR}:/app/offkai-data:ro
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

export OFFKAI_JWT_SECRET='same-secret-used-by-the-bot'
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

## Frontend request flow

1. The bot sends the attendee a complete signed personal URL in Discord DM.
2. The browser opens `/?token=<signed-token>`.
3. The Next.js server verifies the token with `OFFKAI_JWT_SECRET`.
4. The Next.js server reads the mounted `events.json` and `responses.json` files.
5. The server returns only the event and attendee fields required to render the RSVP card.

The raw JSON files are never exposed publicly.

## Personal URL contract

The bot already sends a URL in this format:

```text
https://<frontend-domain>/?token=<signed-token>
```

The token payload includes:

```json
{
  "user_id": 123456789,
  "event_name": "Bandori 10th Offkai"
}
```

The bot and frontend must use the same `OFFKAI_JWT_SECRET`.

## Remaining packaging follow-up

Commit a generated `package-lock.json` after running `npm install`. The current Dockerfile can build without it, but a lockfile makes dependency installation reproducible and allows the Docker build to use `npm ci`.
