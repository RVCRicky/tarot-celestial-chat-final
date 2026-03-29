import { getServiceSupabase } from '../../../lib/serverSupabase'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()

  const { error } = await supabase
    .from('reader_statuses')
    .update({
      admin_force_status: body.forceStatus || null,
      status: body.forceStatus === 'offline' ? 'Offline' : body.forceStatus === 'online' ? 'Libre' : body.currentStatus || 'Libre'
    })
    .eq('reader_name', body.readerName)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
