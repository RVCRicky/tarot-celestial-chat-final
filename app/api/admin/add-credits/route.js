import { getServiceSupabase } from '../../../../lib/serverSupabase'

export async function POST(req) {
  const supabase = getServiceSupabase()
  const body = await req.json()
  const amount = Number(body.amount || 0)

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', body.profileId)
    .single()

  const currentCredits = profile?.credits || 0
  const { error } = await supabase
    .from('profiles')
    .update({ credits: currentCredits + amount })
    .eq('id', body.profileId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
