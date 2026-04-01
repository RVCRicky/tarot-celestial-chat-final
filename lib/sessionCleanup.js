import { READERS, currentShift } from './chatShared'

function forcedOrShiftStatus(readerName, adminForceStatus = null) {
  if (adminForceStatus === 'offline') return 'Offline'
  if (adminForceStatus === 'online') return 'Libre'

  const reader = READERS.find((item) => item.name === readerName)
  return reader?.shift === currentShift() ? 'Libre' : 'Offline'
}

export async function cleanupReaderSessionState(supabase) {
  const nowIso = new Date().toISOString()
  const staleBefore = new Date(Date.now() - 45000).toISOString()

  const [{ data: sessions }, { data: readerStatuses }] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('id,current_reader_name,status,heartbeat_at')
      .or(`status.eq.active,status.eq.closed`),
    supabase
      .from('reader_statuses')
      .select('reader_name,status,active_session_id,admin_force_status')
  ])

  const sessionMap = new Map((sessions || []).map((session) => [session.id, session]))
  const staleActiveIds = []
  const readersToRelease = []

  for (const session of sessions || []) {
    const isActive = session.status === 'active'
    const isStale = !session.heartbeat_at || session.heartbeat_at < staleBefore

    if (isActive && isStale) {
      staleActiveIds.push(session.id)
      if (session.current_reader_name) {
        readersToRelease.push({
          reader_name: session.current_reader_name,
          active_session_id: session.id
        })
      }
    }
  }

  for (const row of readerStatuses || []) {
    if (row.status !== 'Ocupada' || !row.active_session_id) continue

    const linked = sessionMap.get(row.active_session_id)
    const shouldRelease =
      !linked ||
      linked.status !== 'active' ||
      !linked.heartbeat_at ||
      linked.heartbeat_at < staleBefore

    if (shouldRelease) {
      readersToRelease.push({
        reader_name: row.reader_name,
        active_session_id: row.active_session_id,
        admin_force_status: row.admin_force_status
      })
    }
  }

  const uniqueReaders = new Map()
  for (const item of readersToRelease) {
    uniqueReaders.set(`${item.reader_name}:${item.active_session_id || 'none'}`, item)
  }

  for (const item of uniqueReaders.values()) {
    await supabase
      .from('reader_statuses')
      .update({
        status: forcedOrShiftStatus(item.reader_name, item.admin_force_status || null),
        occupied_by_profile_id: null,
        active_session_id: null,
        last_seen_at: nowIso
      })
      .eq('reader_name', item.reader_name)
      .eq('active_session_id', item.active_session_id)
  }

  if (staleActiveIds.length) {
    await supabase
      .from('chat_sessions')
      .update({
        status: 'closed',
        current_reader_name: null,
        mode: 'closed',
        heartbeat_at: nowIso
      })
      .in('id', staleActiveIds)
  }
}
