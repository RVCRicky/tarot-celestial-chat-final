import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  await cleanupReaderSessionState(supabase)

  await supabase
    .from('chat_sessions')
    .update({
      heartbeat_at: new Date().toISOString(),
      mode: body.mode || 'central',
      current_reader_name: body.currentReaderName || null,
      status: 'active'
    })
    .eq('id', body.sessionId)

  if (body.currentReaderName) {
    await supabase
      .from('reader_statuses')
      .update({
        status: 'Ocupada',
        active_session_id: body.sessionId,
        last_seen_at: new Date().toISOString()
      })
      .eq('reader_name', body.currentReaderName)
  }

  return Response.json({ ok: true })
}
