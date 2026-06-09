import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { promises as fs } from 'fs'
import path from 'path'

const JWT_SECRET = new TextEncoder().encode(process.env.OFFKAI_JWT_SECRET ?? '')
const DATA_FILE = path.join(process.cwd(), 'data', 'checkins.json')
const ADMIN_KEY = process.env.ADMIN_KEY ?? ''

type CheckinRecord = { user_id: number; event_name: string; checked_in_at: string; name: string }
type CheckinStore = Record<string, Record<number, CheckinRecord>>  // event_name -> user_id -> record

async function readStore(): Promise<CheckinStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeStore(store: CheckinStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2))
}

// POST /api/checkin — check in via scanned token
export async function POST(request: NextRequest) {
  const { token } = await request.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  let payload: { user_id?: number; event_name?: string } & Record<string, unknown>
  try {
    const { payload: p } = await jwtVerify(token, JWT_SECRET)
    payload = p as typeof payload
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const { user_id, event_name } = payload
  if (!user_id || !event_name) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const store = await readStore()
  if (!store[event_name]) store[event_name] = {}

  if (store[event_name][user_id]) {
    return NextResponse.json({ already_checked_in: true, record: store[event_name][user_id] })
  }

  // Fetch name from attendee API
  let name = `User ${user_id}`
  try {
    const r = await fetch(`${request.nextUrl.origin}/api/attendee?token=${encodeURIComponent(token)}`)
    if (r.ok) {
      const d = await r.json()
      name = (d.attendee?.display_name || d.attendee?.username || name) as string
    }
  } catch { /* use fallback name */ }

  const record: CheckinRecord = {
    user_id,
    event_name: String(event_name),
    checked_in_at: new Date().toISOString(),
    name,
  }
  store[event_name][user_id] = record
  await writeStore(store)

  return NextResponse.json({ checked_in: true, record })
}

// GET /api/checkin?event=<name>&key=<admin_key>
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const event = request.nextUrl.searchParams.get('event')
  const store = await readStore()

  if (event) {
    return NextResponse.json(Object.values(store[event] ?? {}))
  }
  return NextResponse.json(store)
}
