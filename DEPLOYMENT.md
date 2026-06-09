# Deployment

This repository builds and runs as a Next.js standalone Docker container on port `8090`.

## First deployment

1. Install a self-hosted GitHub Actions runner on the deployment host with labels `self-hosted` and `linux`.
   The runner user must be able to run `docker compose` and `curl`.

2. Trigger the first build from:
   **GitHub repository → Actions → Deploy frontend → Run workflow**

3. Verify the container is healthy:

```bash
curl --fail http://127.0.0.1:8090/api/health
# {"status":"ok"}
```

The frontend is now available at `http://<host>:8090`.

## Automatic redeploy

Every push to `main` automatically:

1. Checks out the latest code on the self-hosted runner.
2. Runs `docker compose up -d --build --remove-orphans`.
3. Polls `http://127.0.0.1:8090/api/health` until healthy (up to 60 s); dumps container logs and fails the workflow if it does not respond.
4. Prunes dangling Docker images after a successful deployment.

## Manual host-side redeploy

```bash
cd chibachanners-frontenders
git pull
docker compose up -d --build --remove-orphans
```

## No secrets required for initial rollout

The initial container requires no environment variables or repository secrets.

Optional environment variables (all have safe defaults or return `501`):

| Variable    | Purpose                                       |
|-------------|-----------------------------------------------|
| `MOCK_MODE` | Set to `true` to return static mock data      |
| `ADMIN_KEY` | Key for the admin check-in panel (optional)   |

## Docker Compose

```yaml
services:
  chibachanners-frontend:
    build: .
    container_name: chibachanners-frontend
    restart: unless-stopped
    ports:
      - "8090:8090"
```

## Offkai-bot integration (deferred)

The attendee and check-in routes are placeholders returning `501`. Integration options
are documented in [`offkai-bot-data/README.md`](./offkai-bot-data/README.md).
Do not mount offkai-bot-data until the integration contract is confirmed.
