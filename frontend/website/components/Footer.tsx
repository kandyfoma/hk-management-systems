'use client'

import React from 'react'
import Image from 'next/image'
import { Phone, Mail, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function Footer() {
  const t = useTranslations('footer')
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primaryDark text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="KATMS Logo" width={36} height={36} className="rounded-lg" />
              <span className="font-extrabold text-xl">KATMS</span>
            </div>
            <p className="text-sidebarText text-sm leading-relaxed mb-6 max-w-xs">
              {t('tagline')}
            </p>
            <div className="space-y-2">
              <a href="tel:+243828812498" className="flex items-center gap-2 text-sidebarText hover:text-white transition text-sm">
                <Phone size={14} className="text-secondaryLight" />
                {t('phone')}
              </a>
              <a href="mailto:foma.kandy@gmail.com" className="flex items-center gap-2 text-sidebarText hover:text-white transition text-sm">
                <Mail size={14} className="text-secondaryLight" />
                {t('email')}
              </a>
              <div className="flex items-center gap-2 text-sidebarText text-sm">
                <MapPin size={14} className="text-secondaryLight" />
                {t('location')}
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-5">{t('product')}</h4>
            <ul className="space-y-3">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Modules', href: '#modules' },
                { label: 'Compliance', href: '#compliance' },
                { label: 'Benefits', href: '#benefits' },
                { label: 'Launch App', href: 'https://app.katms.org' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sidebarText hover:text-white transition text-sm">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-5">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
                { label: 'Cookie Policy', href: '#' },
                { label: 'Security', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sidebarText hover:text-white transition text-sm">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebarHover pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sidebarText text-sm">
            © {currentYear} KAT Management System (KATMS). {t('rights')}.
          </p>
          <p className="text-sidebarText text-xs">
            Lubumbashi · DR Congo · ISO 45001 Ready
          </p>
        </div>
      </div>
    </footer>
  )
}

