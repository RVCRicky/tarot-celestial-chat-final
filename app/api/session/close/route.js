import { getServiceSupabase } from '../../../../lib/serverSupabase'

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

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  await cleanupStaleSessions(supabase)

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
