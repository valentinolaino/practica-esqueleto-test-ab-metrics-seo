import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import './globals.css'

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Esqueleto',
    template: '%s · Laboratorio 01',
  },
  description: 'Punto de partida del laboratorio 01. El copy y el caso de prueba están. El mecanismo, no.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4efe6' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1916' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
