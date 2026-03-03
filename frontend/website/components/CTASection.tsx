'use client'

import React from 'react'
import { ArrowRight, Mail, Phone, MapPin } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

export default function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: CTA text */}
          <ScrollReveal>
            <span className="pill bg-successLight text-secondary mb-4">Get Started</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-6 mt-3 tracking-tight leading-tight">
              Ready to Transform Your<br />Occupational Health Management?
            </h2>
            <p className="text-lg text-onSurfaceVariant mb-8 leading-relaxed">
              Join enterprises across DR Congo using KAT OHMS to manage worker
              health, ensure regulatory compliance, and create safer workplaces.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="https://app.katohms.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Launch App <ArrowRight size={18} />
              </a>
              <a
                href="mailto:foma.kandy@gmail.com"
                className="btn-outline"
              >
                <Mail size={18} /> Contact Us
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-onSurfaceVariant">
                <Phone size={16} className="text-secondary" />
                <a href="tel:+243828812498" className="hover:text-primary transition font-medium">
                  +243 82 88 12 498
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-onSurfaceVariant">
                <Mail size={16} className="text-secondary" />
                <a href="mailto:foma.kandy@gmail.com" className="hover:text-primary transition font-medium">
                  foma.kandy@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-onSurfaceVariant">
                <MapPin size={16} className="text-secondary" />
                <span>Lubumbashi, DR Congo</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: what you get */}
          <ScrollReveal delay={2}>
            <div className="bg-white rounded-2xl p-8 border border-outline shadow-sm">
              <h3 className="text-xl font-bold text-primary mb-6">What You Get</h3>
              {[
                { title: 'Complete Setup & Onboarding', desc: 'Professional onboarding and training for your team from day one.' },
                { title: '24/7 Expert Support', desc: 'Dedicated support team available round the clock in French & English.' },
                { title: 'Secure Cloud Hosting', desc: 'Enterprise-grade hosting with automatic backups and 99.9% uptime.' },
                { title: 'Compliance Reporting', desc: 'Auto-generated reports for ISO 45001, ILO, and DR Congo regulations.' },
              ].map((item, i) => {
                const delay = (i + 1) as 1 | 2 | 3 | 4
                return (
                  <div key={i} className={`flex gap-4 ${i < 3 ? 'mb-6 pb-6 border-b border-outline' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-successLight flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-secondary font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <p className="font-semibold text-primary text-sm mb-1">{item.title}</p>
                      <p className="text-onSurfaceVariant text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

