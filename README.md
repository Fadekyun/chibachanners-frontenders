# chibachanners-frontenders

Next.js frontend for Chibaichan offkai RSVP pages.

## Current rollout status

The frontend container is ready to deploy independently on port `8090`.

Included:

- multi-stage Docker build;
- Docker Compose service;
- health endpoint at `/api/health`;
- automatic deployment workflow for Linux self-hosted GitHub Actions runners;
- favicon and web app manifest.

The attendee-specific lookup route is intentionally a placeholder until the bot's real personal-link and cross-container data-sharing contract are confirmed.

## Quick local deployment

```bash
git clone https://github.com/Fadekyun/chibachanners-frontenders.git
cd chibachanners-frontenders
docker compose up -d --build
```

Verify:

```bash
curl --fail http://127.0.0.1:8090/api/health
```

Expected response:

```json
{"status":"ok"}
```

## Automatic deployment

The repository includes `.github/workflows/deploy.yml`.

Register a Linux self-hosted runner for this repository on the deployment host, then start the first build from:

```text
Actions → Deploy frontend → Run workflow
```

Future pushes to `main` rebuild and recreate the frontend container automatically.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete handoff.
