
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const body = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data } = await supabase
    .from('reader_statuses')
    .update({
      active_session_id: body.session_id,
      occupied_by_profile_id: body.profile_id
    })
    .eq('reader_name', body.reader_name)
    .is('active_session_id', null)
    .select()

  if (!data || data.length === 0) {
    return Response.json({ error: 'already taken' }, { status: 409 })
  }

  return Response.json({ success: true })
}
