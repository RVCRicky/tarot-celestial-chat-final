import { getServiceSupabase } from '../../../lib/serverSupabase'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { profileId } = body

  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return Response.json({ session: existing })
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      profile_id: profileId,
      mode: 'central',
      status: 'active',
      heartbeat_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ session: data })
}
