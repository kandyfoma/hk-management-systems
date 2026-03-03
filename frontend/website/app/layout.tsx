import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'KAT OHMS - Occupational Health Management System',
  description: 'Comprehensive workplace health and safety management platform for DR Congo enterprises.',
  keywords: 'occupational health, workplace safety, medical examinations, ISO 45001, DR Congo, Lubumbashi, KAT OHMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
