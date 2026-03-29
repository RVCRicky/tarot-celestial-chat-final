import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

const PACKS = {
  pack_3: {
    name: 'Tarot Celestial · 3 preguntas',
    amount: 300
  },
  pack_5: {
    name: 'Tarot Celestial · 5 preguntas',
    amount: 450
  },
  pack_10: {
    name: 'Tarot Celestial · 10 preguntas',
    amount: 700
  }
}

export async function POST(request) {
  try {
    if (!stripe) {
      return Response.json(
        { error: 'Falta configurar STRIPE_SECRET_KEY en Vercel' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const pack = PACKS[body.packId]

    if (!pack) {
      return Response.json({ error: 'Paquete no válido' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: pack.name
            },
            unit_amount: pack.amount
          },
          quantity: 1
        }
      ],
      metadata: {
        user_id: body.userId,
        pack: body.packId
      },
      success_url: `${origin}/payment/success`,
      cancel_url: `${origin}/payment/cancel`
    })

    return Response.json({ url: session.url })
  } catch (error) {
    return Response.json(
      { error: error.message || 'No se pudo crear la sesión de pago' },
      { status: 500 }
    )
  }
}
