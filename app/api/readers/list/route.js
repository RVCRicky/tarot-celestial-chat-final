import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'
import { READERS, currentShift } from '../../../../lib/chatShared'

export async function GET() {
  const supabase = getServiceSupabase()
  const shift = currentShift()

  await cleanupReaderSessionState(supabase)

  const { data: statusRows } = await supabase
    .from('reader_statuses')
    .select('*')

  const rows = statusRows || []

  const merged = READERS.map((reader) => {
    const dbRow = rows.find((r) => r.reader_name === reader.name)
    const shiftOnline = reader.shift === shift

    let status = shiftOnline ? 'Libre' : 'Offline'

    if (dbRow?.admin_force_status === 'offline') status = 'Offline'
    if (dbRow?.admin_force_status === 'online') status = 'Libre'
    if (dbRow?.status === 'Ocupada' && dbRow?.active_session_id) status = 'Ocupada'

    return {
      ...reader,
      status,
      occupied_by: dbRow?.occupied_by_profile_id || null,
      active_session_id: dbRow?.active_session_id || null
    }
  })

  return Response.json({ readers: merged })
}
