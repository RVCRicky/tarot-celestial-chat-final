import { getServiceSupabase } from '../../../../lib/serverSupabase'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      sender: 'admin',
      sender_name: body.adminName || 'ADMIN',
      text: body.text,
      visible_to_client: true
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, message: data })
}
