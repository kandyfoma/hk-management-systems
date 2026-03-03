'use client'

import React from 'react'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-sm">KAT</span>
              </div>
              <span className="font-bold text-lg">KAT OHMS</span>
            </div>
            <p className="text-gray-300 text-sm">
              Comprehensive occupational health management for modern workplaces.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-lg mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-300 hover:text-white transition text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="#modules" className="text-gray-300 hover:text-white transition text-sm">
                  Modules
                </a>
              </li>
              <li>
                <a href="#compliance" className="text-gray-300 hover:text-white transition text-sm">
                  Compliance
                </a>
              </li>
              <li>
                <a href="https://app.katohms.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition text-sm">
                  Application
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-lg mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@katohms.com" className="text-gray-300 hover:text-white transition text-sm">
                  Email Support
                </a>
              </li>
              <li>
                <a href="tel:+1234567890" className="text-gray-300 hover:text-white transition text-sm">
                  Phone: +1 (234) 567-890
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-lg mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition text-sm">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-300 text-sm">
              © {currentYear} KAT Occupational Health Management System. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-300 hover:text-white transition">
                Twitter
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition">
                LinkedIn
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition">
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
