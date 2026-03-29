import { getServiceSupabase } from '../../../lib/serverSupabase'
import { READERS, currentShift } from '../../../../lib/chatShared'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const { readerName } = body

  const reader = READERS.find((r) => r.name === readerName)
  const shiftOnline = reader?.shift === currentShift()

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      status: shiftOnline ? 'Libre' : 'Offline',
      occupied_by_profile_id: null,
      active_session_id: null,
      last_seen_at: new Date().toISOString()
    })
    .eq('reader_name', readerName)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
