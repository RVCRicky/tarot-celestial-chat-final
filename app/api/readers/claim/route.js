import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { READERS, currentShift } from '../../../../lib/chatShared'

const STALE_SESSION_MS = 1000 * 60 * 2

function releaseStatus(readerName) {
  const reader = READERS.find((r) => r.name === readerName)
  return reader?.shift === currentShift() ? 'Libre' : 'Offline'
}

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

  if (current.status === 'Ocupada' && current.active_session_id) {
    const { data: occupiedSession } = await supabase
      .from('chat_sessions')
      .select('id,status,heartbeat_at,profile_id')
      .eq('id', current.active_session_id)
      .maybeSingle()

    const heartbeatAt = occupiedSession?.heartbeat_at ? new Date(occupiedSession.heartbeat_at).getTime() : 0
    const isStale = !heartbeatAt || Date.now() - heartbeatAt > STALE_SESSION_MS
    const sameProfile = occupiedSession?.profile_id === profileId

    if (!occupiedSession || occupiedSession.status === 'closed' || isStale) {
      await supabase
        .from('reader_statuses')
        .update({
          status: releaseStatus(readerName),
          occupied_by_profile_id: null,
          active_session_id: null,
          last_seen_at: new Date().toISOString()
        })
        .eq('reader_name', readerName)
    } else if (!sameProfile) {
      return Response.json({ error: 'Tarotista ocupada' }, { status: 409 })
    }
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

  if (sessionId) {
    await supabase
      .from('chat_sessions')
      .update({
        mode: 'reader',
        current_reader_name: readerName,
        heartbeat_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', sessionId)
  }

  return Response.json({ ok: true })
}
