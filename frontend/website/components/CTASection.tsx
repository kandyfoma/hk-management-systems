'use client'

import React from 'react'
import { ArrowRight, Mail } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-primaryLight to-primaryDark text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Ready to Transform Your Occupational Health Management?
        </h2>
        <p className="text-xl text-white/80 mb-12 leading-relaxed">
          Join 500+ enterprises using KAT OHMS to manage worker health, ensure compliance, and create safer workplaces.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="https://app.katohms.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-secondaryLight hover:bg-accent text-primary font-bold text-lg transition transform hover:scale-105"
          >
            Launch Application <ArrowRight size={20} />
          </a>
          <a
            href="mailto:support@katohms.com"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-white text-white hover:bg-white hover:text-primary font-bold text-lg transition"
          >
            <Mail size={20} /> Contact Sales
          </a>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <h3 className="text-2xl font-bold mb-6">What You Get</h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <div className="font-bold text-secondaryLight mb-2">✓ Complete Setup</div>
              <p className="text-white/80 text-sm">Professional onboarding and training for your team</p>
            </div>
            <div>
              <div className="font-bold text-secondaryLight mb-2">✓ 24/7 Support</div>
              <p className="text-white/80 text-sm">Dedicated support team available round the clock</p>
            </div>
            <div>
              <div className="font-bold text-secondaryLight mb-2">✓ Cloud Infrastructure</div>
              <p className="text-white/80 text-sm">Secure, scalable hosting with automatic backups</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/70 mt-8">
          Or call us: <a href="tel:+1234567890" className="font-bold hover:text-secondaryLight transition">+1 (234) 567-890</a>
        </p>
      </div>
    </section>
  )
}
