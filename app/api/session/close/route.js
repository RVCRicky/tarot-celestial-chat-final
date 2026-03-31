import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { READERS, currentShift } from '../../../../lib/chatShared'

function readerReleaseStatus(readerName) {
  const reader = READERS.find((r) => r.name === readerName)
  const shiftOnline = reader?.shift === currentShift()
  return shiftOnline ? 'Libre' : 'Offline'
}

export async function POST(req) {
  try {
    const supabase = getServiceSupabase()
    const body = await req.json()

    if (body.sessionId) {
      await supabase
        .from('chat_sessions')
        .update({
          status: 'closed',
          mode: 'central',
          current_reader_name: null,
          heartbeat_at: new Date().toISOString()
        })
        .eq('id', body.sessionId)
    }

    if (body.readerName) {
      await supabase
        .from('reader_statuses')
        .update({
          status: readerReleaseStatus(body.readerName),
          occupied_by_profile_id: null,
          active_session_id: null,
          last_seen_at: new Date().toISOString()
        })
        .eq('reader_name', body.readerName)
    }

    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo cerrar la sesión' }, { status: 500 })
  }
}
