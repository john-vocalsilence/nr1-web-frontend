import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vocal Silence - Questionário NR1',
  description: 'Questionários para avaliação psicossocial no ambiente de trabalho.',
  icons: {
    icon: [
      {
        url: '/assets/VocalSilenceLogo.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/assets/VocalSilenceLogo.png',
        sizes: '16x16',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/assets/VocalSilenceLogo.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
    shortcut: '/assets/VocalSilenceLogo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/assets/VocalSilenceLogo.png" type="image/png" />
        <link rel="shortcut icon" href="/assets/VocalSilenceLogo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/VocalSilenceLogo.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
