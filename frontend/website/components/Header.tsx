'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [isMobileOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">KAT</span>
            </div>
            <span className="font-bold text-lg text-primary hidden sm:inline">
              KAT OHMS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-700 hover:text-primary transition">
              Features
            </Link>
            <Link href="#modules" className="text-gray-700 hover:text-primary transition">
              Modules
            </Link>
            <Link href="#compliance" className="text-gray-700 hover:text-primary transition">
              Compliance
            </Link>
            <Link href="#benefits" className="text-gray-700 hover:text-primary transition">
              Benefits
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://app.katohms.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primaryDark transition font-medium"
            >
              Launch App
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            <Link
              href="#features"
              className="block py-2 text-gray-700 hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#modules"
              className="block py-2 text-gray-700 hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              Modules
            </Link>
            <Link
              href="#compliance"
              className="block py-2 text-gray-700 hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              Compliance
            </Link>
            <Link
              href="#benefits"
              className="block py-2 text-gray-700 hover:text-primary transition"
              onClick={() => setIsOpen(false)}
            >
              Benefits
            </Link>
            <a
              href="https://app.katohms.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primaryDark transition font-medium text-center"
            >
              Launch App
            </a>
          </div>
        )}
      </nav>
    </header>
  )
}
