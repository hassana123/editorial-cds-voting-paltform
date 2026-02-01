import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'NYSC Kano Editorial CDS Election',
  description: 'Electronic Election System for NYSC Kano Editorial & Publicity CDS - Connecting the People',
  generator: 'Hassy',
  icons: {
    icon: [
      {
        url: '/images/logo.jpeg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/images/logo.jpeg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/images/logo.jpeg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/images/logo.jpeg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen md-px-0 px-4">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
