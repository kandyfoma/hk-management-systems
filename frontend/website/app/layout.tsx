import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KAT OHMS - Occupational Health Management System',
  description: 'Comprehensive workplace health and safety management platform. Medical examinations, risk assessments, compliance, and incident reporting.',
  keywords: 'occupational health, workplace safety, medical examinations, compliance, ISO 45001',
  openGraph: {
    title: 'KAT OHMS - Occupational Health Management System',
    description: 'Comprehensive workplace health and safety management platform',
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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
