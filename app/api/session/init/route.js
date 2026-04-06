import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { profileId } = body
  const now = new Date().toISOString()

  await cleanupReaderSessionState(supabase)

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
      .update({ heartbeat_at: now })
      .eq('id', existing.id)

    return Response.json({ session: { ...existing, heartbeat_at: now } })
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      profile_id: profileId,
      mode: 'central',
      status: 'active',
      current_reader_name: null,
      heartbeat_at: now
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ session: data })
}
