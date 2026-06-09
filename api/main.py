import json
import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
EVENTS_FILE = DATA_DIR / "events.json"
RESPONSES_FILE = DATA_DIR / "responses.json"
API_KEY = os.getenv("OFFKAI_API_KEY", "")

app = FastAPI(title="offkai-api", docs_url=None, redoc_url=None)
security = HTTPBearer()


def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)) -> None:
    if not API_KEY or credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def load_events() -> list[dict[str, Any]]:
    if not EVENTS_FILE.exists():
        return []
    return json.loads(EVENTS_FILE.read_text())


def load_responses() -> dict[str, Any]:
    if not RESPONSES_FILE.exists():
        return {}
    return json.loads(RESPONSES_FILE.read_text())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/events/active", dependencies=[Depends(verify_api_key)])
def get_active_event() -> dict[str, Any]:
    events = load_events()
    open_events = [e for e in events if e.get("open") and not e.get("archived")]
    if not open_events:
        raise HTTPException(status_code=404, detail="No active event")
    return open_events[0]


@app.get("/events/{event_name}", dependencies=[Depends(verify_api_key)])
def get_event(event_name: str) -> dict[str, Any]:
    for e in load_events():
        if e.get("event_name") == event_name:
            return e
    raise HTTPException(status_code=404, detail="Event not found")


@app.get("/events/{event_name}/attendees", dependencies=[Depends(verify_api_key)])
def list_attendees(event_name: str) -> list[dict[str, Any]]:
    event_data = load_responses().get(event_name, {})
    result = []
    for record in event_data.get("attendees", []):
        result.append({"status": "attending", **record})
    for record in event_data.get("waitlist", []):
        result.append({"status": "waitlist", **record})
    return result


@app.get("/events/{event_name}/attendees/{user_id}", dependencies=[Depends(verify_api_key)])
def get_attendee(event_name: str, user_id: int) -> dict[str, Any]:
    event_data = load_responses().get(event_name, {})
    for record in event_data.get("attendees", []):
        if record.get("user_id") == user_id:
            return {"status": "attending", **record}
    for record in event_data.get("waitlist", []):
        if record.get("user_id") == user_id:
            return {"status": "waitlist", **record}
    raise HTTPException(status_code=404, detail="Attendee not found")
