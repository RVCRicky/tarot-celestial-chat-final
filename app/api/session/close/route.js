import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { statusFromShift } from '../../../../lib/readerState'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const now = new Date().toISOString()

  if (body.currentReaderName) {
    const { data: current } = await supabase
      .from('reader_statuses')
      .select('admin_force_status')
      .eq('reader_name', body.currentReaderName)
      .single()

    await supabase
      .from('reader_statuses')
      .update({
        status: statusFromShift(body.currentReaderName, current?.admin_force_status || null),
        occupied_by_profile_id: null,
        active_session_id: null,
        last_seen_at: now
      })
      .eq('reader_name', body.currentReaderName)
      .eq('active_session_id', body.sessionId)
  }

  await supabase
    .from('chat_sessions')
    .update({
      status: 'closed',
      current_reader_name: null,
      mode: 'closed',
      heartbeat_at: now
    })
    .eq('id', body.sessionId)

  return Response.json({ ok: true })
}
