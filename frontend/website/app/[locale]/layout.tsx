import type { Metadata } from 'next'
import { getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

export async function generateMetadata({ params: { locale } }: any): Promise<Metadata> {
  const title = locale === 'fr'
    ? 'KATMS - Système de Gestion'
    : 'KATMS - Management System'
  const description = locale === 'fr'
    ? 'Système de gestion pour pharmacies, hôpitaux et médecine du travail. Lubumbashi, RDC.'
    : 'Management system for pharmacies, hospitals, and occupational health. Lubumbashi, DRC.'
  return {
    title,
    description,
    icons: { icon: '/logo.png', apple: '/logo.png' },
    openGraph: { title, description, url: 'https://www.katms.org', siteName: 'KATMS', type: 'website' },
  }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages({ locale })
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
