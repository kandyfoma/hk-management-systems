import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'KAT Management System - Pharmacy, Hospital & Occupational Health',
  description: 'Unified management system for pharmacy, hospital operations, and occupational health. Comprehensive solutions for DR Congo enterprises.',
  keywords: 'management system, pharmacy management, hospital management, occupational health, DR Congo, Lubumbashi, KATMS',
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
