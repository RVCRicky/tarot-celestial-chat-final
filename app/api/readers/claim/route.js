import { getServiceSupabase } from '../../../lib/serverSupabase'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { readerName, profileId, sessionId } = body

  const { data: current } = await supabase
    .from('reader_statuses')
    .select('*')
    .eq('reader_name', readerName)
    .single()

  if (!current) {
    return Response.json({ error: 'Tarotista no encontrada' }, { status: 404 })
  }

  if (current.status === 'Ocupada' && current.occupied_by_profile_id !== profileId) {
    return Response.json({ error: 'Tarotista ocupada' }, { status: 409 })
  }

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      status: 'Ocupada',
      occupied_by_profile_id: profileId,
      active_session_id: sessionId,
      last_seen_at: new Date().toISOString()
    })
    .eq('reader_name', readerName)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
