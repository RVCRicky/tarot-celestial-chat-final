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
  const { profileId } = body

  await cleanupStaleSessions(supabase)

  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('chat_sessions')
      .update({ heartbeat_at: new Date().toISOString() })
      .eq('id', existing.id)

    return Response.json({
      session: {
        ...existing,
        heartbeat_at: new Date().toISOString()
      }
    })
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      profile_id: profileId,
      mode: 'central',
      status: 'active',
      current_reader_name: null,
      heartbeat_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ session: data })
}
