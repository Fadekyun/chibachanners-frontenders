import { NextResponse } from 'next/server'

// Placeholder — check-in processing is not yet implemented.
// When the offkai-bot integration is in place, this route will:
//   POST: accept a scanned token, verify it against bot data, record the check-in
//   GET:  return a flat list of check-in records for the admin panel (key-gated)

export async function POST() {
  return NextResponse.json({ error: 'checkin_pending' }, { status: 501 })
}

export async function GET() {
  return NextResponse.json({ error: 'checkin_pending' }, { status: 501 })
}
