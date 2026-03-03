'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { useState, useMemo } from 'react'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Extract locale from pathname (first segment)
  const locale = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return (segments[0] === 'en' || segments[0] === 'fr') ? segments[0] : 'en'
  }, [pathname])

  // Get the pathname without the locale prefix
  const pathWithoutLocale = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] === 'en' || segments[0] === 'fr') {
      return '/' + segments.slice(1).join('/')
    }
    return pathname
  }, [pathname])

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
  ]

  const handleLanguageChange = (newLocale: string) => {
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surfaceVariant transition text-onSurfaceVariant hover:text-primary"
      >
        <Globe size={18} />
        <span className="text-sm font-medium uppercase">{locale}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-outline rounded-lg shadow-lg z-50">
          {languages.map((lang) => (
            <Link
              key={lang.code}
              href={`/${lang.code}${pathWithoutLocale}`}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2.5 text-sm transition ${
                locale === lang.code
                  ? 'bg-primaryFaded text-primary font-semibold'
                  : 'text-onSurfaceVariant hover:bg-surfaceVariant'
              }`}
            >
              {lang.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
