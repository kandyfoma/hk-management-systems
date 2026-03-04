'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const [isMobileOpen, setIsOpen] = useState(false)
  const t = useTranslations('nav')
  const th = useTranslations('header')

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-outline shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="KATMS Logo" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-col gap-0">
                <span className="font-bold text-lg text-primary hidden sm:inline leading-tight">
                  KATMS
                </span>
                <span className="text-xs text-onSurfaceVariant hidden sm:inline font-medium">
                  {th('subtitle')}
                </span>
              </div>
              <div className="hidden sm:flex gap-1.5 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primaryFaded text-primary">
                  {th('badge1')}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-white">
                  {th('badge2')}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-onSurfaceVariant hover:text-primary transition">
              {t('features')}
            </Link>
            <Link href="#modules" className="text-onSurfaceVariant hover:text-primary transition">
              {t('modules')}
            </Link>
            <Link href="#compliance" className="text-onSurfaceVariant hover:text-primary transition">
              {t('compliance')}
            </Link>
            <Link href="#benefits" className="text-onSurfaceVariant hover:text-primary transition">
              {t('benefits')}
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <a
              href="https://app.katms.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primaryDark transition font-medium"
            >
              {t('launch')}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-surfaceVariant rounded-lg transition"
            onClick={() => setIsOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileOpen && (
          <div className="md:hidden pb-4 border-t border-outline">
            <Link
              href="#features"
              className="block py-2 text-onSurfaceVariant hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              {t('features')}
            </Link>
            <Link
              href="#modules"
              className="block py-2 text-onSurfaceVariant hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              {t('modules')}
            </Link>
            <Link
              href="#compliance"
              className="block py-2 text-onSurfaceVariant hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              {t('compliance')}
            </Link>
            <Link
              href="#benefits"
              className="block py-2 text-onSurfaceVariant hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              {t('benefits')}
            </Link>
            <div className="py-3 border-t border-outline my-3">
              <LanguageSwitcher />
            </div>
            <a
              href="https://app.katms.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primaryDark transition font-medium text-center"
            >
              {t('launch')}
            </a>
          </div>
        )}
      </nav>
    </header>
  )
}
