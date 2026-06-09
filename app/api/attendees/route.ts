import { NextRequest, NextResponse } from 'next/server'

// Placeholder — upstream attendee list is not yet connected.
// MOCK_MODE=true returns a static list for local development and UI testing only.

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

  return NextResponse.json({ error: 'attendees_pending' }, { status: 501 })
}
