import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params: { locale } }: any): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const title = locale === 'fr' 
    ? 'KATMS - Système Unifié de Gestion (Pharmacie, Hôpital et Santé Occupationnelle)'
    : 'KATMS - Unified Management System for Pharmacy, Hospital & Occupational Health'
  const description = locale === 'fr'
    ? 'Système complet de gestion pour les pharmacies, hôpitaux et santé occupationnelle. Solutions intégrées pour les entreprises de la RDC depuis Lubumbashi.'
    : 'Unified management system for pharmacies, hospitals, and occupational health. Integrated solutions for DR Congo enterprises from Lubumbashi.'

  return {
    title,
    description,
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },
    openGraph: {
      title,
      description,
      url: 'https://www.katms.org',
      siteName: 'KAT OHMS',
      type: 'website',
      images: [
        {
          url: '/logo.png',
          width: 1200,
          height: 630,
          alt: 'KAT OHMS Logo',
        }
      ]
    },
  }
}

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
