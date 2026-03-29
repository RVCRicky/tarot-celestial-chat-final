TAROT CELESTIAL FULL MVP

1. SUBE TODO EL CONTENIDO AL REPO Y HAZ DEPLOY EN VERCEL

2. VARIABLES DE ENTORNO EN VERCEL
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app

3. EN SUPABASE EJECUTA supabase_schema.sql

4. EN SUPABASE AUTH
- desactiva confirmación de email si quieres acceso inmediato
- activa Google si quieres login con Google

5. EN STRIPE
- crea webhook a /api/stripe/webhook
- evento: checkout.session.completed

6. LOGO
- súbelo en /public/logo.png

NOTAS IMPORTANTES
- Este proyecto ya monta landing, login, register, central, tarotistas por turnos,
  transferencia, créditos persistentes, Stripe y reservas guardadas.
- El email automático de reservas no está activado porque necesitaría un proveedor de email.
- El comportamiento del central y tarotistas está montado con reglas de producto MVP, no con IA avanzada.
