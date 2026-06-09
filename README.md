# chibachanners-frontenders

Next.js frontend for Chibachan offkai RSVP pages.

## What is included

- Multi-stage Docker build (Next.js standalone server, non-root user)
- Docker Compose service on port `8090`
- Health endpoint at `/api/health`
- Attendee RSVP view with QR code display
- Admin check-in panel (attendee lookup and QR scan, placeholder until bot integration)
- Favicon and web app manifest
- GitHub Actions workflow for automatic deployment on a self-hosted Linux runner

## First manual build

```bash
git clone https://github.com/Fadekyun/chibachanners-frontenders.git
cd chibachanners-frontenders
docker compose up -d --build
```

Verify health:

```bash
curl --fail http://127.0.0.1:8090/api/health
# {"status":"ok"}
```

## Automatic redeploy

Register a self-hosted Linux runner for this repository, then push to `main`.
The workflow at `.github/workflows/deploy.yml` rebuilds and recreates the container automatically.

To trigger manually: **Actions → Deploy frontend → Run workflow**.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for setup details.

## Self-hosted runner requirement

The workflow runs on `[self-hosted, linux]`. No cloud runners or repository secrets
are required for initial rollout.

## Offkai-bot integration (deferred)

The attendee routes are intentional placeholders. They return `501` until the bot's
data-sharing contract is confirmed. See [`offkai-bot-data/README.md`](./offkai-bot-data/README.md)
for the planned integration options (shared host folder, Docker volume, or internal API).
