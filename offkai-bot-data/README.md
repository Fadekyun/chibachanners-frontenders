# offkai-bot-data — placeholder only

This directory is a placeholder. No production bot data is committed here.

## Purpose

When the offkai-bot integration is ready, the frontend will need access to the bot's
live event and attendee data. This directory marks the intended mount point.

## Integration options (choose one when the time comes)

### a. Shared host folder mount (read-only)

Mount the bot container's host data folder into the frontend container read-only:

```yaml
services:
  chibachanners-frontend:
    volumes:
      - /path/on/host/bot-data:/app/offkai-bot-data:ro
```

### b. Shared named Docker volume (read-only)

If both containers run on the same host, use a named volume:

```yaml
services:
  chibachanners-frontend:
    volumes:
      - offkai_bot_data:/app/offkai-bot-data:ro

volumes:
  offkai_bot_data:
    external: true
```

The bot container writes to the same volume without the `:ro` flag.

### c. Internal API

If the containers cannot share storage (different hosts, cloud deployment), the
frontend calls the bot over an internal network instead of reading files directly.
No volume mount needed; configure the API base URL via an environment variable.

## What not to do

- Do not commit real attendee data, event JSON, or bot tokens here.
- Do not mount this directory until the integration contract is confirmed.
