import { READERS, currentShift } from './chatShared'

function forcedOrShiftStatus(readerName, adminForceStatus = null) {
  if (adminForceStatus === 'offline') return 'Offline'
  if (adminForceStatus === 'online') return 'Libre'

  const reader = READERS.find((item) => item.name === readerName)
  return reader?.shift === currentShift() ? 'Libre' : 'Offline'
}

export async function cleanupReaderSessionState(supabase) {
  const nowIso = new Date().toISOString()

  const [{ data: sessions }, { data: readerStatuses }] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('id,current_reader_name,status'),
    supabase
      .from('reader_statuses')
      .select('reader_name,status,active_session_id,admin_force_status')
  ])

  const sessionMap = new Map((sessions || []).map((session) => [session.id, session]))
  const readersToRelease = []

  // 🔥 SOLO liberar si la sesión NO existe o NO está activa
  for (const row of readerStatuses || []) {
    if (row.status !== 'Ocupada' || !row.active_session_id) continue

    const linked = sessionMap.get(row.active_session_id)

    const shouldRelease =
      !linked || linked.status !== 'active'

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
  }

  // 🔥 limpiar sesiones inválidas (sin afectar activas)
  const staleSessions = (sessions || []).filter(
    (s) => s.status !== 'active'
  )

  if (staleSessions.length) {
    await supabase
      .from('chat_sessions')
      .update({
        current_reader_name: null,
        mode: 'closed',
        heartbeat_at: nowIso
      })
      .in('id', staleSessions.map(s => s.id))
  }
}
