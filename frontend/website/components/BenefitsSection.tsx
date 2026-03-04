'use client'

import React from 'react'
import { TrendingUp, Lock, Clock, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ScrollReveal from './ScrollReveal'

export default function BenefitsSection() {
  const t = useTranslations('benefits')

  const benefits = [
    { icon: TrendingUp, title: t('efficiency'), description: t('efficiencyDesc') },
    { icon: Lock, title: t('compliance'), description: t('complianceDesc') },
    { icon: Clock, title: t('safety'), description: t('safetyDesc') },
    { icon: BarChart3, title: t('data'), description: t('dataDesc') },
  ]

  const stats = [
    { value: '70%', label: t('stat1Label') },
    { value: '3×', label: t('stat2Label') },
    { value: '99.9%', label: t('stat3Label') },
  ]

  return (
    <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div>
            <ScrollReveal>
              <span className="pill bg-successLight text-secondary mb-4">{t('badge')}</span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-6 mt-3 tracking-tight">
                {t('title')}
              </h2>
              <p className="text-lg text-onSurfaceVariant mb-10 leading-relaxed">
                {t('subtitle')}
              </p>
            </ScrollReveal>

            <div className="space-y-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                const delay = ((index % 4) + 1) as 1 | 2 | 3 | 4
                return (
                  <ScrollReveal key={index} delay={delay}>
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 w-12 h-12 bg-successLight rounded-xl flex items-center justify-center">
                        <Icon size={22} className="text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-primary mb-1">{benefit.title}</h3>
                        <p className="text-sm text-onSurfaceVariant leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>

          {/* Right — stat card */}
          <ScrollReveal delay={2} className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-primary to-primaryDark rounded-2xl p-8 text-white">
              <h3 className="text-lg font-bold mb-8 text-white/80">{t('platformMetrics')}</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-4xl font-extrabold text-secondaryLight mb-1">{s.value}</div>
                    <div className="text-xs text-white/60 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-6 grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="font-bold text-secondaryLight mb-1">GDPR</div>
                  <div className="text-xs text-white/60">{t('gdprLabel')}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="font-bold text-secondaryLight mb-1">ISO 27001</div>
                  <div className="text-xs text-white/60">{t('isoLabel')}</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

