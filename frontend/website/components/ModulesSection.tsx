'use client'

import React from 'react'
import { Stethoscope, Volume2, Eye, Wind, Pill, Briefcase } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ScrollReveal from './ScrollReveal'

export default function ModulesSection() {
  const t = useTranslations('modules')

  const modules = [
    { icon: Stethoscope, key: 'medical' },
    { icon: Volume2,     key: 'audio' },
    { icon: Eye,         key: 'vision' },
    { icon: Wind,        key: 'spiro' },
    { icon: Pill,        key: 'drug' },
    { icon: Briefcase,   key: 'incident' },
  ]

  return (
    <section id="modules" className="py-24 px-4 sm:px-6 lg:px-8 bg-surfaceVariant">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="pill bg-primaryFaded text-primary mb-4">{t('badge')}</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-4 mt-3 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-onSurfaceVariant max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(({ icon: Icon, key }, index) => {
            const delay = ((index % 3) + 1) as 1 | 2 | 3
            return (
              <ScrollReveal key={index} delay={delay}>
                <div className="card-lift bg-surface rounded-2xl p-7 border border-outline h-full">
                  <div className="w-11 h-11 bg-gradient-to-br from-primary to-secondaryLight rounded-xl flex items-center justify-center mb-5">
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-4">{t(key + '.title')}</h3>
                  <ul className="space-y-2">
                    {['f1','f2','f3','f4'].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-onSurfaceVariant">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {t(key + '.' + f)}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}