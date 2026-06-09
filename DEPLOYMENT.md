# Docker deployment and offkai-bot API handoff

This repository is a Next.js standalone server. Build and run it as a Docker container exposed on host port `8090`.

## Build and run the frontend

```bash
docker build -t chibachanners-frontend:latest .

docker run -d \
  --name chibachanners-frontend \
  --restart unless-stopped \
  --network offkai-network \
  -p 8090:8090 \
  -e OFFKAI_JWT_SECRET \
  -e OFFKAI_API_URL=http://offkai-bot:8080/api \
  -e OFFKAI_API_KEY \
  -e MOCK_MODE=false \
  chibachanners-frontend:latest
```

The deployment host should provide `OFFKAI_JWT_SECRET` and `OFFKAI_API_KEY` through its secret-management method. Do not commit either value.

## Docker Compose example

```yaml
services:
  offkai-bot:
    container_name: offkai-bot
    # Existing offkai-bot image or build configuration goes here.
    expose:
      - "8080"
    networks:
      - offkai-network

  chibachanners-frontend:
    build: .
    container_name: chibachanners-frontend
    restart: unless-stopped
    depends_on:
      - offkai-bot
    ports:
      - "8090:8090"
    environment:
      OFFKAI_JWT_SECRET: ${OFFKAI_JWT_SECRET}
      OFFKAI_API_URL: http://offkai-bot:8080/api
      OFFKAI_API_KEY: ${OFFKAI_API_KEY}
      MOCK_MODE: "false"
    networks:
      - offkai-network

networks:
  offkai-network:
```

Only the frontend port `8090` needs to be host-facing. The bot API can remain private inside the Docker network.

## Health check

```bash
curl --fail http://127.0.0.1:8090/api/health
```

Expected response:

```json
{"status":"ok"}
```

## Frontend request flow

1. The bot sends the attendee a personal frontend URL in Discord DM.
2. The browser opens `/?token=<signed-token>`.
3. The page requests `/api/attendee?token=<signed-token>` from the Next.js server.
4. The Next.js route verifies the token with `OFFKAI_JWT_SECRET`.
5. The Next.js server calls the internal offkai-bot API with `Authorization: Bearer <OFFKAI_API_KEY>`.
6. The browser receives only the attendee and event records required to render the RSVP card.

The browser never calls the bot API directly and never receives the API key.

## Personal frontend URL contract

The bot is responsible for generating and sending the attendee-facing frontend URL in its Discord message or DM. The frontend does not create or send that link.

The bot already provides a signed personal URL in this format:

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

The bot and frontend must use the same `OFFKAI_JWT_SECRET`. An expiry claim is recommended so old personal RSVP links stop working after the event.

No additional bot-side link-generation work is required for the frontend integration.

## Required offkai-bot API contract

The bot needs to expose an HTTP listener on `0.0.0.0:8080` and accept a bearer token configured on the deployment host.

### `GET /api/health`

Returns HTTP `200` when the API process is running.

```json
{"status":"ok"}
```

### `GET /api/events/{event_name}`

Returns HTTP `200` with the event record required by the frontend, or HTTP `404` when the event does not exist.

Required response fields:

```json
{
  "event_name": "Bandori 10th Offkai",
  "venue": "Example venue",
  "address": "Tokyo, Japan",
  "google_maps_link": "https://example.invalid/maps",
  "event_datetime": "2026-06-14T12:00:00+09:00",
  "event_deadline": "2026-06-12T00:00:00+09:00",
  "open": true,
  "drinks": ["Oolong Tea (L)"],
  "max_capacity": 30
}
```

Do not return internal Discord fields such as `channel_id`, `thread_id`, `message_id`, `creator_id`, `ping_role_id`, or `role_id` unless a later frontend feature explicitly requires them.

### `GET /api/events/{event_name}/attendees/{user_id}`

Returns HTTP `200` with a matching attendee or waitlist entry, or HTTP `404` when the user has no RSVP for the event.

Required response fields:

```json
{
  "user_id": 123456789,
  "event_name": "Bandori 10th Offkai",
  "status": "attending",
  "username": "example-user",
  "display_name": "Example User",
  "drinks": ["Oolong Tea (L)"],
  "extra_people": 1,
  "extras_names": ["Guest name"],
  "behavior_confirmed": true,
  "arrival_confirmed": true
}
```

Use `"status": "waitlist"` for a waitlist entry.

## Remaining packaging follow-up

Commit a generated `package-lock.json` after running `npm install`. The current Dockerfile can build without it, but a lockfile makes dependency installation reproducible and allows the Docker build to use `npm ci`.
