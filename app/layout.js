export const metadata = {
  title: 'Tarot Celestial',
  description: 'Siempre a tu lado'
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f8f5ff' }}>
        {children}
      </body>
    </html>
  )
}
