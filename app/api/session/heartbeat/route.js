
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const body = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  await supabase
    .from('chat_sessions')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', body.session_id)

  return Response.json({ ok: true })
}
