import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params: { locale } }: any): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'hero' })
  const title = locale === 'fr' 
    ? 'KAT OHMS - Système de Gestion de la Santé Occupationnelle'
    : 'KAT OHMS - Occupational Health Management System'
  const description = locale === 'fr'
    ? 'Plateforme complète de gestion de la santé et de la sécurité au travail pour les entreprises de la RDC. Examens médicaux, évaluations des risques, conformité ISO 45001 et signalement des incidents depuis Lubumbashi.'
    : 'Comprehensive workplace health and safety management platform for DR Congo enterprises. Medical examinations, risk assessments, ISO 45001 compliance, and incident reporting from Lubumbashi.'

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
      url: 'https://www.katohms.com',
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
