import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { readerName, profileId, sessionId } = body

  await cleanupReaderSessionState(supabase)

  // 🔥 LIMPIEZA FORZADA DEL READER (CLAVE)
  await supabase
    .from('reader_statuses')
    .update({
      occupied_by_profile_id: null,
      active_session_id: null
    })
    .eq('reader_name', readerName)

  const { data: current } = await supabase
    .from('reader_statuses')
    .select('*')
    .eq('reader_name', readerName)
    .single()

  if (!current) {
    return Response.json({ error: 'Tarotista no encontrada' }, { status: 404 })
  }

  if (
    current.status === 'Ocupada' &&
    current.active_session_id &&
    current.active_session_id !== sessionId &&
    current.occupied_by_profile_id !== profileId
  ) {
    return Response.json({ error: 'Tarotista ocupada' }, { status: 409 })
  }

  const now = new Date().toISOString()

  await supabase
    .from('chat_sessions')
    .update({
      mode: 'reader',
      current_reader_name: readerName,
      heartbeat_at: now,
      status: 'active'
    })
    .eq('id', sessionId)

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      status: 'Ocupada',
      occupied_by_profile_id: profileId,
      active_session_id: sessionId,
      last_seen_at: now
    })
    .eq('reader_name', readerName)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
