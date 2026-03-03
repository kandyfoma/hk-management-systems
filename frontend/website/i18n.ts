import { getRequestConfig } from 'next-intl/server'
import type { GetRequestConfigParams } from 'next-intl/server'
import en from './messages/en.json'
import fr from './messages/fr.json'

const messages: Record<string, any> = { en, fr }

export default getRequestConfig(async (params: GetRequestConfigParams) => {
  const locale = (params.locale || 'en') as keyof typeof messages
  
  return {
    locale,
    messages: messages[locale] || messages['en'],
  }
})
