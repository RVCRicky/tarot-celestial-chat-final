import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const pack = session.metadata?.pack

    let credits = 0
    if (pack === 'pack_3') credits = 3
    if (pack === 'pack_5') credits = 5
    if (pack === 'pack_10') credits = 10

    if (userId) {
      await supabase.from('payments').insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount: session.amount_total,
        credits,
        status: 'completed'
      })

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('auth_user_id', userId)
        .single()

      const currentCredits = profile?.credits || 0

      await supabase
        .from('profiles')
        .update({ credits: currentCredits + credits })
        .eq('auth_user_id', userId)
    }
  }

  return new Response('OK', { status: 200 })
}
