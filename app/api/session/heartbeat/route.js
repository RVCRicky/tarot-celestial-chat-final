import { getServiceSupabase } from '../../../../lib/serverSupabase'
export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  await supabase
    .from('chat_sessions')
    .update({
      heartbeat_at: new Date().toISOString(),
      mode: body.mode || 'central',
      current_reader_name: body.currentReaderName || null
    })
    .eq('id', body.sessionId)

  return Response.json({ ok: true })
}
