import { NextRequest, NextResponse } from 'next/server'

const OFFKAI_API_URL = process.env.OFFKAI_API_URL ?? ''
const OFFKAI_API_KEY = process.env.OFFKAI_API_KEY ?? ''
const MOCK_MODE = process.env.MOCK_MODE === 'true'
const ADMIN_KEY = process.env.ADMIN_KEY ?? ''

const MOCK_EVENT_NAME = 'Bandori 10th Offkai'
const MOCK_ATTENDEES = [
  { user_id: 123, username: 'fadekyun', display_name: 'Fadekyun', drinks: ['Highball (L)'], extra_people: 1, extras_names: ['Senpai'], status: 'attending' },
  { user_id: 124, username: 'sakichan', display_name: 'Sakichan', drinks: ['Oolong Tea (L)', 'Cream Soda (L)'], extra_people: 0, extras_names: [], status: 'attending' },
  { user_id: 125, username: 'hoshino', display_name: 'Hoshino', drinks: ['Sapporo Beer (L)'], extra_people: 2, extras_names: ['Friend A', 'Friend B'], status: 'attending' },
  { user_id: 126, username: 'arisa', display_name: 'Arisa', drinks: ['Fresh Lemon Sour (L)'], extra_people: 0, extras_names: [], status: 'waitlist' },
]

// GET /api/attendees?key=<admin_key> — returns { event_name, attendees }
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (MOCK_MODE) {
    return NextResponse.json({ event_name: MOCK_EVENT_NAME, attendees: MOCK_ATTENDEES })
  }

  try {
    const headers = { Authorization: `Bearer ${OFFKAI_API_KEY}` }

    // Fetch the active (open, not archived) event
    const activeRes = await fetch(`${OFFKAI_API_URL}/events/active`, { headers, next: { revalidate: 30 } })
    if (!activeRes.ok) throw new Error('no active event')
    const activeEvent = await activeRes.json()
    const event_name = activeEvent.event_name as string

    // Fetch attendees for that event
    const attendeesRes = await fetch(
      `${OFFKAI_API_URL}/events/${encodeURIComponent(event_name)}/attendees`,
      { headers, next: { revalidate: 30 } }
    )
    if (!attendeesRes.ok) throw new Error(`upstream ${attendeesRes.status}`)

    return NextResponse.json({ event_name, attendees: await attendeesRes.json() })
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
