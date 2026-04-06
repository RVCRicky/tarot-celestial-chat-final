import { isSessionFresh } from './readerState'
import { statusFromShift } from './readerState'

export async function cleanupReaderSessionState(supabase) {
  const nowIso = new Date().toISOString()
  const nowMs = Date.now()

  const [{ data: sessions }, { data: readerStatuses }] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('id,current_reader_name,status,heartbeat_at'),
    supabase
      .from('reader_statuses')
      .select('reader_name,status,active_session_id,occupied_by_profile_id,admin_force_status')
  ])

  const sessionMap = new Map((sessions || []).map((session) => [session.id, session]))

  for (const row of readerStatuses || []) {
    const linked = row.active_session_id ? sessionMap.get(row.active_session_id) : null
    const ownsFreshSession = linked && linked.current_reader_name === row.reader_name && isSessionFresh(linked, nowMs)

    if (ownsFreshSession) {
      if (row.status !== 'Ocupada' || !row.occupied_by_profile_id) {
        await supabase
          .from('reader_statuses')
          .update({
            status: 'Ocupada',
            last_seen_at: nowIso
          })
          .eq('reader_name', row.reader_name)
      }
      continue
    }

    if (row.active_session_id || row.occupied_by_profile_id || row.status === 'Ocupada') {
      await supabase
        .from('reader_statuses')
        .update({
          status: statusFromShift(row.reader_name, row.admin_force_status || null),
          occupied_by_profile_id: null,
          active_session_id: null,
          last_seen_at: nowIso
        })
        .eq('reader_name', row.reader_name)
    }
  }

  const staleActiveSessions = (sessions || []).filter((session) => session.status === 'active' && !isSessionFresh(session, nowMs))

  if (staleActiveSessions.length) {
    await supabase
      .from('chat_sessions')
      .update({
        status: 'closed',
        current_reader_name: null,
        mode: 'closed',
        heartbeat_at: nowIso
      })
      .in('id', staleActiveSessions.map((s) => s.id))
  }
}
