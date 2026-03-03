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
  description: 'Comprehensive workplace health and safety management platform for DR Congo enterprises. Medical examinations, risk assessments, ISO 45001 compliance, and incident reporting from Lubumbashi.',
  keywords: 'occupational health, workplace safety, medical examinations, ISO 45001, DR Congo, Lubumbashi, KAT OHMS',
  openGraph: {
    title: 'KAT OHMS - Occupational Health Management System',
    description: 'Comprehensive occupational health management platform for DR Congo enterprises.',
    url: 'https://www.katohms.com',
    siteName: 'KAT OHMS',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
