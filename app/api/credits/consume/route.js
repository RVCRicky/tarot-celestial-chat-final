import { getServiceSupabase } from '../../../../lib/serverSupabase'

export async function POST(req) {
  try {
    const supabase = getServiceSupabase()
    const body = await req.json()
    const profileId = body.profileId

    if (!profileId) {
      return Response.json({ error: 'Falta profileId' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('consume_question_credit', {
      p_profile_id: profileId
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data
    return Response.json({
      ok: !!result?.allowed,
      allowed: !!result?.allowed,
      credits: Number(result?.remaining_credits || 0),
      freeQuestionUsed: !!result?.free_question_used,
      reason: result?.reason || null
    })
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudieron consumir créditos' }, { status: 500 })
  }
}
