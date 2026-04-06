import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('reader_statuses')
      .select('*')

    if (error) {
      return new Response(JSON.stringify({ readers: [] }), { status: 200 })
    }

    const translateShift = (shift) => {
      if (shift === 'morning') return 'Mañana'
      if (shift === 'afternoon') return 'Tarde'
      if (shift === 'night') return 'Noche'
      return shift || ''
    }

    const readers = (data || []).map(r => {
      let status = 'Libre'

      if (r.active_session_id) {
        status = 'Ocupada'
      }

      return {
        name: r.reader_name,
        specialty: translateShift(r.shift),
        status
      }
    })

    return new Response(JSON.stringify({ readers }), { status: 200 })

  } catch {
    return new Response(JSON.stringify({ readers: [] }), { status: 200 })
  }
}
