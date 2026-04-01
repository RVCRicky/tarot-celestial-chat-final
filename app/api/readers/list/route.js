import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 🔥 1. TRAER ESTADOS REALES
    const { data, error } = await supabase
      .from('reader_statuses')
      .select('*')

    if (error) {
      console.error('ERROR reader_statuses:', error)
      return new Response(JSON.stringify({ readers: [] }), { status: 200 })
    }

    // 🔥 traducir turno
    const translateShift = (shift) => {
      switch (shift) {
        case 'morning':
          return 'Mañana'
        case 'afternoon':
          return 'Tarde'
        case 'night':
          return 'Noche'
        default:
          return shift || ''
      }
    }

    // 🔥 detectar si está en su horario
    const isShiftActive = (shift) => {
      const hour = new Date().getHours()

      if (shift === 'morning') return hour >= 6 && hour < 14
      if (shift === 'afternoon') return hour >= 14 && hour < 22
      if (shift === 'night') return hour >= 22 || hour < 6

      return true
    }

    // 🔥 2. MAPEO FINAL (SIN DEPENDER DE status)
    const readers = (data || []).map(r => {
      let finalStatus = 'Libre'

      // ✅ PRIORIDAD ABSOLUTA: sesión activa
      if (r.active_session_id) {
        finalStatus = 'Ocupada'
      }

      // ✅ SI NO → horario
      else if (!isShiftActive(r.shift)) {
        finalStatus = 'Offline'
      }

      return {
        name: r.reader_name,
        specialty: translateShift(r.shift),
        status: finalStatus
      }
    })

    return new Response(
      JSON.stringify({ readers }),
      { status: 200 }
    )

  } catch (err) {
    console.error('FATAL readers list:', err)

    return new Response(
      JSON.stringify({ readers: [] }),
      { status: 200 }
    )
  }
}
