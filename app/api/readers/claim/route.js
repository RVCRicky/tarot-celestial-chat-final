import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'
import { READERS, isShiftActive } from '../../../../lib/chatShared'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { readerName, profileId, sessionId } = body

  await cleanupReaderSessionState(supabase)

  const { data: current, error: currentError } = await supabase
    .from('reader_statuses')
    .select('*')
    .eq('reader_name', readerName)
    .single()

  if (currentError || !current) {
    return Response.json({ error: 'Tarotista no encontrada' }, { status: 404 })
  }

  const reader = READERS.find((item) => item.name === readerName)
  if (!reader || !isShiftActive(reader.shift)) {
    return Response.json({ error: 'Tarotista fuera de turno' }, { status: 409 })
  }

  if (
    current.active_session_id &&
    current.active_session_id !== sessionId &&
    current.occupied_by_profile_id &&
    current.occupied_by_profile_id !== profileId
  ) {
    return Response.json({ error: 'Tarotista ocupada' }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { error: sessionError } = await supabase
    .from('chat_sessions')
    .update({
      mode: 'reader',
      current_reader_name: readerName,
      heartbeat_at: now,
      status: 'active'
    })
    .eq('id', sessionId)

  if (sessionError) {
    return Response.json({ error: sessionError.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      status: 'Ocupada',
      occupied_by_profile_id: profileId,
      active_session_id: sessionId,
      last_seen_at: now
    })
    .eq('reader_name', readerName)
    .or(`active_session_id.is.null,active_session_id.eq.${sessionId}`)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
