import { getServiceSupabase } from '../../../../lib/serverSupabase'
import { cleanupReaderSessionState } from '../../../../lib/sessionCleanup'
import { READERS } from '../../../../lib/chatShared'
import { isSessionFresh, statusFromShift } from '../../../../lib/readerState'

export async function GET() {
  try {
    const supabase = getServiceSupabase()
    await cleanupReaderSessionState(supabase)

    const [{ data: rows, error }, { data: sessions }] = await Promise.all([
      supabase.from('reader_statuses').select('*'),
      supabase.from('chat_sessions').select('id,current_reader_name,status,heartbeat_at')
    ])

    if (error) return Response.json({ readers: [] })

    const sessionMap = new Map((sessions || []).map((session) => [session.id, session]))

    const readers = (rows || []).map((row) => {
      const catalog = READERS.find((reader) => reader.name === row.reader_name)
      const linked = row.active_session_id ? sessionMap.get(row.active_session_id) : null
      const occupied =
        !!row.occupied_by_profile_id &&
        !!linked &&
        linked.current_reader_name === row.reader_name &&
        isSessionFresh(linked)

      return {
        name: row.reader_name,
        specialty: catalog?.specialty || row.shift || '',
        description: catalog?.description || '',
        status: occupied ? 'Ocupada' : statusFromShift(row.reader_name, row.admin_force_status || null)
      }
    })

    return Response.json({ readers })
  } catch {
    return Response.json({ readers: [] })
  }
}
