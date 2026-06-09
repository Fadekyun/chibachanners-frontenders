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

## First deployment

Clone the repository on the deployment host:

```bash
git clone https://github.com/Fadekyun/chibachanners-frontenders.git
cd chibachanners-frontenders
```

Create an environment file on the host:

```bash
cat > .env <<'EOF'
OFFKAI_JWT_SECRET=replace-with-the-same-secret-used-by-the-bot
OFFKAI_DATA_DIR=/absolute/path/to/offkai-bot/data
EOF
```

Do not commit `.env`.

Start the frontend:

```bash
docker compose up -d --build
```

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

Docker does not automatically rebuild merely because the GitHub repository changed.

To deploy the latest frontend code manually:

```bash
cd chibachanners-frontenders
git pull --ff-only
docker compose up -d --build
```

This rebuilds the image only when required and recreates the running frontend container.

## Optional automatic deployment

To rebuild automatically after every push to `main`, the deployment host needs an automation layer. Common options are:

1. a GitHub Actions self-hosted runner on the deployment host;
2. a webhook that runs the update commands;
3. a scheduled cron job that periodically pulls and rebuilds.

For the initial deployment, manual updates are simpler and easier to debug.

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
