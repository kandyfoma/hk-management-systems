'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ScrollReveal from './ScrollReveal'

export default function ComplianceSection() {
  const t = useTranslations('compliance')
  const standards = [
    {
      name: 'ISO 45001',
      description: 'Occupational Health & Safety Management System',
      features: ['Risk assessment workflows', 'Incident reporting', 'Compliance tracking', 'Performance evaluation'],
    },
    {
      name: 'ISO 27001',
      description: 'Information Security Management',
      features: ['Data encryption', 'Role-based access controls', 'Audit logging', 'Vulnerability management'],
    },
    {
      name: 'ILO Standards',
      description: 'International Labour Organization',
      features: ['C155 Convention', 'C161 Convention', 'R194 Recommendation', 'Occupational disease registry'],
    },
    {
      name: 'GDPR / Data Privacy',
      description: 'Data Protection & Privacy Compliance',
      features: ['Data subject rights', 'Consent management', 'Retention policies', 'Breach notification'],
    },
  ]

  return (
    <section id="compliance" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-primary overflow-hidden">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/workers-2.jpg"
      >
        <source src="/videos/hero-bg-4k.mp4" type="video/mp4" />
      </video>

      <div className="relative max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="pill bg-white/10 text-secondaryLight border border-secondaryLight/30 mb-4">{t('badge')}</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 mt-3 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {standards.map((standard, index) => {
            const delay = ((index % 4) + 1) as 1 | 2 | 3 | 4
            return (
              <ScrollReveal key={index} delay={delay}>
                <div className="bg-white/5 hover:bg-white/10 transition rounded-2xl p-7 border border-white/10 h-full">
                  <h3 className="text-xl font-extrabold text-secondaryLight mb-1">{standard.name}</h3>
                  <p className="text-white/50 text-sm mb-5">{standard.description}</p>
                  <ul className="space-y-2">
                    {standard.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                        <span className="text-white/75 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        <ScrollReveal>
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { badge: 'ISO 45001', sub: 'OHS Certified' },
                { badge: 'ISO 27001', sub: 'Security Certified' },
                { badge: 'GDPR', sub: 'Data Compliant' },
                { badge: 'ILO', sub: 'Labour Standards' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-secondaryLight/20 flex items-center justify-center mb-3">
                    <CheckCircle2 size={26} className="text-secondaryLight" />
                  </div>
                  <p className="font-extrabold text-secondaryLight text-sm">{item.badge}</p>
                  <p className="text-white/50 text-xs">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

