import { NextRequest, NextResponse } from 'next/server'

const OFFKAI_API_URL = process.env.OFFKAI_API_URL ?? ''
const OFFKAI_API_KEY = process.env.OFFKAI_API_KEY ?? ''
const MOCK_MODE = process.env.MOCK_MODE === 'true'
const ADMIN_KEY = process.env.ADMIN_KEY ?? ''

const MOCK_ATTENDEES = [
  { user_id: 123, username: 'fadekyun', display_name: 'Fadekyun', drinks: ['Highball (L)'], extra_people: 1, extras_names: ['Senpai'], status: 'attending' },
  { user_id: 124, username: 'sakichan', display_name: 'Sakichan', drinks: ['Oolong Tea (L)', 'Cream Soda (L)'], extra_people: 0, extras_names: [], status: 'attending' },
  { user_id: 125, username: 'hoshino', display_name: 'Hoshino', drinks: ['Sapporo Beer (L)'], extra_people: 2, extras_names: ['Friend A', 'Friend B'], status: 'attending' },
  { user_id: 126, username: 'arisa', display_name: 'Arisa', drinks: ['Fresh Lemon Sour (L)'], extra_people: 0, extras_names: [], status: 'waitlist' },
]

// GET /api/attendees?event=<name>&key=<admin_key>
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const event = request.nextUrl.searchParams.get('event')
  if (!event) return NextResponse.json({ error: 'missing_event' }, { status: 400 })

  if (MOCK_MODE) {
    return NextResponse.json(MOCK_ATTENDEES)
  }

  try {
    const r = await fetch(
      `${OFFKAI_API_URL}/events/${encodeURIComponent(event)}/attendees`,
      { headers: { Authorization: `Bearer ${OFFKAI_API_KEY}` }, next: { revalidate: 30 } }
    )
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    return NextResponse.json(await r.json())
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
