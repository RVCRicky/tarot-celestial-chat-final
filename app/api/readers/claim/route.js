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
  const { readerName, profileId, sessionId } = body

  await cleanupStaleSessions(supabase)

  const { data: current } = await supabase
    .from('reader_statuses')
    .select('*')
    .eq('reader_name', readerName)
    .single()

  if (!current) {
    return Response.json({ error: 'Tarotista no encontrada' }, { status: 404 })
  }

  if (current.status === 'Ocupada' && current.active_session_id && current.active_session_id !== sessionId && current.occupied_by_profile_id !== profileId) {
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
