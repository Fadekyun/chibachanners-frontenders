import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const OFFKAI_JWT_SECRET = process.env.OFFKAI_JWT_SECRET ?? ''
const JWT_SECRET = new TextEncoder().encode(OFFKAI_JWT_SECRET)
const OFFKAI_API_URL = process.env.OFFKAI_API_URL ?? ''
const OFFKAI_API_KEY = process.env.OFFKAI_API_KEY ?? ''
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

  if (!OFFKAI_API_URL || !OFFKAI_API_KEY) return configurationError()

  try {
    const headers = { Authorization: `Bearer ${OFFKAI_API_KEY}` }
    const [attendeeRes, eventRes] = await Promise.all([
      fetch(`${OFFKAI_API_URL}/events/${encodeURIComponent(String(event_name))}/attendees/${user_id}`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${OFFKAI_API_URL}/events/${encodeURIComponent(String(event_name))}`, {
        headers,
        cache: 'no-store',
      }),
    ])

    if (attendeeRes.status === 404 || eventRes.status === 404) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (!attendeeRes.ok) throw new Error(`attendee upstream ${attendeeRes.status}`)
    if (!eventRes.ok) throw new Error(`event upstream ${eventRes.status}`)

    const [attendee, event] = await Promise.all([attendeeRes.json(), eventRes.json()])
    return NextResponse.json({ attendee, event })
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
