import { getServiceSupabase } from '../../../../lib/serverSupabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const [{ data: sessions }, { data: readers }, { data: profiles }] = await Promise.all([
    supabase.from('chat_sessions').select('*').order('heartbeat_at', { ascending: false }).limit(50),
    supabase.from('reader_statuses').select('*').order('reader_name', { ascending: true }),
    supabase.from('profiles').select('id,display_name,email,country,credits,created_at').order('created_at', { ascending: false }).limit(100)
  ])

  return Response.json({
    sessions: sessions || [],
    readers: readers || [],
    profiles: profiles || []
  })
}
