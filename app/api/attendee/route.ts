import { readFile } from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OFFKAI_JWT_SECRET = process.env.OFFKAI_JWT_SECRET ?? ''
const JWT_SECRET = new TextEncoder().encode(OFFKAI_JWT_SECRET)
const OFFKAI_EVENTS_FILE = process.env.OFFKAI_EVENTS_FILE ?? '/app/offkai-data/events.json'
const OFFKAI_RESPONSES_FILE = process.env.OFFKAI_RESPONSES_FILE ?? '/app/offkai-data/responses.json'
const MOCK_MODE = process.env.MOCK_MODE === 'true'

const MOCK_EVENT = {
  event_name: 'Bandori 10th Offkai',
  venue: 'TBD',
  address: 'Tokyo, Japan',
  google_maps_link: '',
  event_datetime: '2026-06-14T12:00:00+09:00',
  event_deadline: '2026-06-12T00:00:00+09:00',
  open: true,
  drinks: ['Oolong Tea (L)', 'Cream Soda (L)', 'Coca-Cola (L)', 'Sapporo Beer (L)', 'Highball (L)', 'Fresh Lemon Sour (L)'],
  max_capacity: 30,
}

const MOCK_ATTENDEE = {
  status: 'attending',
  username: 'fadekyun',
  display_name: 'Fadekyun',
  drinks: ['Highball (L)'],
  extra_people: 1,
  extras_names: ['Senpai'],
  behavior_confirmed: true,
  arrival_confirmed: false,
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function readJsonWithRetry(path: string, attempts = 3): Promise<unknown> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as unknown
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await sleep(50 * (attempt + 1))
    }
  }

  throw lastError
}

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function safeBoolean(value: unknown) {
  return value === true
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function findEvent(events: unknown, eventName: string): JsonRecord | undefined {
  if (!Array.isArray(events)) return undefined
  return events.find((event) => isRecord(event) && safeString(event.event_name).toLowerCase() === eventName.toLowerCase())
}

function findEventResponses(responses: unknown, eventName: string): JsonRecord | undefined {
  if (!isRecord(responses)) return undefined
  const matchedKey = Object.keys(responses).find((key) => key.toLowerCase() === eventName.toLowerCase())
  const eventResponses = matchedKey ? responses[matchedKey] : undefined
  return isRecord(eventResponses) ? eventResponses : undefined
}

function findUser(entries: unknown, userId: number): JsonRecord | undefined {
  if (!Array.isArray(entries)) return undefined
  return entries.find((entry) => isRecord(entry) && String(entry.user_id) === String(userId))
}

function sanitizeEvent(event: JsonRecord) {
  return {
    event_name: safeString(event.event_name),
    venue: safeString(event.venue, 'TBD'),
    address: safeString(event.address),
    google_maps_link: safeString(event.google_maps_link),
    event_datetime: safeString(event.event_datetime),
    event_deadline: typeof event.event_deadline === 'string' ? event.event_deadline : null,
    open: safeBoolean(event.open),
    drinks: safeStringArray(event.drinks),
    max_capacity: safeNumber(event.max_capacity),
  }
}

function sanitizeAttendee(attendee: JsonRecord, status: 'attending' | 'waitlist', eventName: string) {
  return {
    user_id: safeNumber(attendee.user_id),
    event_name: safeString(attendee.event_name, eventName),
    status,
    username: safeString(attendee.username, 'Unknown User'),
    display_name: typeof attendee.display_name === 'string' ? attendee.display_name : null,
    drinks: safeStringArray(attendee.drinks),
    extra_people: safeNumber(attendee.extra_people) ?? 0,
    extras_names: safeStringArray(attendee.extras_names),
    behavior_confirmed: safeBoolean(attendee.behavior_confirmed),
    arrival_confirmed: safeBoolean(attendee.arrival_confirmed),
  }
}

function configurationError() {
  return NextResponse.json({ error: 'server_misconfigured' }, { status: 503 })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  if (!OFFKAI_JWT_SECRET) return configurationError()

  let payload: { user_id?: number; event_name?: string } & Record<string, unknown>
  try {
    const { payload: verifiedPayload } = await jwtVerify(token, JWT_SECRET)
    payload = verifiedPayload as typeof payload
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const { user_id, event_name } = payload
  if (!user_id || !event_name) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  if (MOCK_MODE) {
    return NextResponse.json({
      attendee: { ...MOCK_ATTENDEE, user_id, event_name },
      event: { ...MOCK_EVENT, event_name },
    })
  }

  try {
    const [events, responses] = await Promise.all([
      readJsonWithRetry(OFFKAI_EVENTS_FILE),
      readJsonWithRetry(OFFKAI_RESPONSES_FILE),
    ])

    const event = findEvent(events, event_name)
    if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const eventResponses = findEventResponses(responses, event_name)
    const attendee = findUser(eventResponses?.attendees, user_id)
    if (attendee) {
      return NextResponse.json({ attendee: sanitizeAttendee(attendee, 'attending', event_name), event: sanitizeEvent(event) })
    }

    const waitlistEntry = findUser(eventResponses?.waitlist, user_id)
    if (waitlistEntry) {
      return NextResponse.json({ attendee: sanitizeAttendee(waitlistEntry, 'waitlist', event_name), event: sanitizeEvent(event) })
    }

    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'data_unavailable' }, { status: 503 })
  }
}
