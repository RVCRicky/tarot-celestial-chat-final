import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { READERS, currentShift } from '../../../../lib/chatShared'

async function cleanupStaleSessions(supabase) {
  const staleBefore = new Date(Date.now() - 45000).toISOString()

  const { data: staleSessions } = await supabase
    .from('chat_sessions')
    .select('id,current_reader_name')
    .eq('status', 'active')
    .lt('heartbeat_at', staleBefore)

  for (const session of staleSessions || []) {
    if (session.current_reader_name) {
      await supabase
        .from('reader_statuses')
        .update({
          status: 'Libre',
          occupied_by_profile_id: null,
          active_session_id: null,
          last_seen_at: new Date().toISOString()
        })
        .eq('reader_name', session.current_reader_name)
        .eq('active_session_id', session.id)
    }
  }

  await supabase
    .from('chat_sessions')
    .update({ status: 'closed', current_reader_name: null, mode: 'closed' })
    .eq('status', 'active')
    .lt('heartbeat_at', staleBefore)
}

export async function GET() {
  await supabase
    .from('sessions')
    .update({ status: 'closed' })
    .lt('last_activity', new Date(Date.now() - 30000).toISOString())
    .eq('status', 'active')
  const supabase = getServiceSupabase()
  const shift = currentShift()

  await cleanupStaleSessions(supabase)

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
    if (dbRow?.status === 'Ocupada' && dbRow?.active_session_id) status = 'Ocupada'

    return {
      ...reader,
      status,
      occupied_by: dbRow?.occupied_by_profile_id || null,
      active_session_id: dbRow?.active_session_id || null
    }
  })

  return Response.json({ readers: merged })
}
