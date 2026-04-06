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

    const isShiftActive = (shift) => {
      const hour = new Date().getHours()
      if (shift === 'morning') return hour >= 6 && hour < 14
      if (shift === 'afternoon') return hour >= 14 && hour < 22
      if (shift === 'night') return hour >= 22 || hour < 6
      return true
    }

    const readers = (data || []).map(r => {
      let status = 'Libre'

      // 🔥 SOLO ocupada si coincide sesión real
      if (r.active_session_id && r.occupied_by_profile_id) {
        status = 'Ocupada'
      } 
      else if (!isShiftActive(r.shift)) {
        status = 'Offline'
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
