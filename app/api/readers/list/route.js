
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()

  const { data: readers, error: readersError } = await supabase
    .from('reader_statuses')
    .select('*')

  if (readersError) {
    return Response.json({ error: readersError.message }, { status: 500 })
  }

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, heartbeat_at, current_reader_name')

  const result = (readers || []).map(reader => {
    const session = (sessions || []).find(
      s => s.current_reader_name === reader.reader_name
    )

    if (!session) {
      return { ...reader, computed_status: 'Libre' }
    }

    const seconds = (now - new Date(session.heartbeat_at)) / 1000

    if (seconds < 20) {
      return { ...reader, computed_status: 'Ocupada' }
    }

    return { ...reader, computed_status: 'Libre' }
  })

  return Response.json(result)
}
