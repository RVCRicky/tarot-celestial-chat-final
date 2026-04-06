
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date(Date.now() - 30000).toISOString()

  await supabase
    .from('chat_sessions')
    .update({ status: 'closed' })
    .lt('heartbeat_at', now)

  await supabase
    .from('reader_statuses')
    .update({
      active_session_id: null,
      occupied_by_profile_id: null
    })

  return Response.json({ cleaned: true })
}
