import { getServiceSupabase } from '../../../lib/serverSupabase'

async function sendReservationEmail({ email, displayName, readerName, reservedFor }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from || !email) {
    return { sent: false, skipped: true }
  }

  const dateText = new Date(reservedFor).toLocaleString('es-ES')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Confirmación de reserva · Tarot Celestial',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hola ${displayName || 'cielo'}</h2>
          <p>Tu reserva en Tarot Celestial ha quedado confirmada.</p>
          <p><strong>Tarotista:</strong> ${readerName}</p>
          <p><strong>Fecha:</strong> ${dateText}</p>
          <p>Gracias por confiar en nosotras 💫</p>
        </div>
      `
    })
  })

  return { sent: res.ok, skipped: false }
}

export async function POST(request) {
  try {
    const supabase = getServiceSupabase()
    const body = await request.json()

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        profile_id: body.profileId,
        reader_name: body.readerName,
        reserved_for: body.reservedFor,
        status: 'confirmed',
        notes: body.notes || null
      })
      .select('*')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const emailResult = await sendReservationEmail({
      email: body.email,
      displayName: body.displayName,
      readerName: body.readerName,
      reservedFor: body.reservedFor
    })

    return Response.json({ ok: true, reservation, emailSent: emailResult.sent, emailSkipped: emailResult.skipped })
  } catch (error) {
    return Response.json({ error: error.message || 'No se pudo crear la reserva' }, { status: 500 })
  }
}
