import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { READERS, currentShift } from '../../../../lib/chatShared'

const STALE_SESSION_MS = 1000 * 60 * 2

function fallbackStatus(readerName, shift) {
  const reader = READERS.find((r) => r.name === readerName)
  const shiftOnline = reader?.shift === shift
  return shiftOnline ? 'Libre' : 'Offline'
}

async function cleanupStaleReaders(supabase, statusRows, shift) {
  const now = Date.now()

  for (const row of statusRows || []) {
    if (row.status !== 'Ocupada' || !row.active_session_id) continue

    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id,status,heartbeat_at')
      .eq('id', row.active_session_id)
      .maybeSingle()

    const heartbeatAt = session?.heartbeat_at ? new Date(session.heartbeat_at).getTime() : 0
    const isStale = !heartbeatAt || now - heartbeatAt > STALE_SESSION_MS
    const missingOrClosed = !session || session.status === 'closed'

    if (missingOrClosed || isStale) {
      await supabase
        .from('reader_statuses')
        .update({
          status: fallbackStatus(row.reader_name, shift),
          occupied_by_profile_id: null,
          active_session_id: null,
          last_seen_at: new Date().toISOString()
        })
        .eq('reader_name', row.reader_name)
    }
  }
}

export async function GET() {
  const supabase = getServiceSupabase()
  const shift = currentShift()

  const { data: initialRows } = await supabase
    .from('reader_statuses')
    .select('*')

  await cleanupStaleReaders(supabase, initialRows || [], shift)

  const { data: statusRows } = await supabase
    .from('reader_statuses')
    .select('*')

  const rows = statusRows || []

  const merged = READERS.map((reader) => {
    const dbRow = rows.find((r) => r.reader_name === reader.name)
    const shiftOnline = reader.shift === shift

    let status = shiftOnline ? 'Libre' : 'Offline'

    if (dbRow?.admin_force_status === 'offline') status = 'Offline'
    if (dbRow?.admin_force_status === 'online') status = 'Libre'
    if (dbRow?.status === 'Ocupada') status = 'Ocupada'

    return {
      ...reader,
      status,
      occupied_by: dbRow?.occupied_by_profile_id || null,
      active_session_id: dbRow?.active_session_id || null
    }
  })

  return Response.json({ readers: merged })
}
