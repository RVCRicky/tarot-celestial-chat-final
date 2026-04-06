import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { statusFromShift } from '../../../../lib/readerState'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { readerName, sessionId } = body
  const now = new Date().toISOString()

  const { data: current } = await supabase
    .from('reader_statuses')
    .select('reader_name,active_session_id,admin_force_status')
    .eq('reader_name', readerName)
    .single()

  if (!current) {
    return Response.json({ error: 'Tarotista no encontrada' }, { status: 404 })
  }

  if (current.active_session_id && current.active_session_id !== sessionId) {
    return Response.json({ ok: true, skipped: true })
  }

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      status: statusFromShift(readerName, current.admin_force_status || null),
      occupied_by_profile_id: null,
      active_session_id: null,
      last_seen_at: now
    })
    .eq('reader_name', readerName)
    .eq('active_session_id', sessionId)

  await supabase
    .from('chat_sessions')
    .update({
      mode: 'central',
      current_reader_name: null,
      heartbeat_at: now,
      status: 'active'
    })
    .eq('id', sessionId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
