import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  await cleanupReaderSessionState(supabase)

  if (body.currentReaderName) {
    await supabase
      .from('reader_statuses')
      .update({
        status: 'Libre',
        occupied_by_profile_id: null,
        active_session_id: null,
        last_seen_at: new Date().toISOString()
      })
      .eq('reader_name', body.currentReaderName)
      .eq('active_session_id', body.sessionId)
  }

  await supabase
    .from('chat_sessions')
    .update({
      status: 'closed',
      current_reader_name: null,
      mode: body.mode === 'reader' ? 'closed' : body.mode || 'closed',
      heartbeat_at: new Date().toISOString()
    })
    .eq('id', body.sessionId)

  return Response.json({ ok: true })
}
