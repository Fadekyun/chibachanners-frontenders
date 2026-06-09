import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('token')
  if (!reference) return NextResponse.json({ error: 'missing_reference' }, { status: 400 })

  if (MOCK_MODE) {
    return NextResponse.json({
      attendee: { ...MOCK_ATTENDEE, reference },
      event: MOCK_EVENT,
    })
  }

  return NextResponse.json({ error: 'attendee_lookup_pending' }, { status: 501 })
}
