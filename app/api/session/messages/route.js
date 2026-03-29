import { getServiceSupabase } from '../../../../lib/serverSupabase'

export async function GET(req) {
  const supabase = getServiceSupabase()
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ messages: data || [] })
}

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      sender: body.sender,
      text: body.text,
      sender_name: body.senderName || null,
      visible_to_client: body.visibleToClient !== false
    })
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: data })
}
