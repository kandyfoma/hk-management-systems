'use client'

import React from 'react'
import { Heart, AlertCircle, Shield, BarChart3, Users, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import ScrollReveal from './ScrollReveal'

export default function FeaturesSection() {
  const t = useTranslations('features')

  const features = [
    {
      icon: Heart,
      title: t('medical.name'),
      points: [t('medical.b1'), t('medical.b2'), t('medical.b3'), t('medical.desc')],
    },
    {
      icon: AlertCircle,
      title: t('incident.name'),
      points: [t('incident.b1'), t('incident.b2'), t('incident.b3'), t('incident.desc')],
    },
    {
      icon: BarChart3,
      title: t('risk.name'),
      points: [t('risk.b1'), t('risk.b2'), t('risk.b3'), t('risk.desc')],
    },
    {
      icon: Shield,
      title: t('compliance.name'),
      points: [t('compliance.b1'), t('compliance.b2'), t('compliance.b3'), t('compliance.desc')],
    },
    {
      icon: Users,
      title: t('analytics.name'),
      points: [t('analytics.b1'), t('analytics.b2'), t('analytics.b3'), t('analytics.desc')],
    },
    {
      icon: CheckCircle,
      title: t('documentation.name'),
      points: [t('documentation.b1'), t('documentation.b2'), t('documentation.b3'), t('documentation.desc')],
    },
  ]

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="pill bg-successLight text-secondary mb-4">{t('badge')}</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-4 mt-3 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg text-onSurfaceVariant max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const delay = ((index % 3) + 1) as 1 | 2 | 3
            return (
              <ScrollReveal key={index} delay={delay}>
                <div className="card-lift bg-background rounded-2xl p-7 border border-outline h-full">
                  <div className="w-11 h-11 bg-successLight rounded-xl flex items-center justify-center mb-5">
                    <Icon size={22} className="text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-4">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-onSurfaceVariant">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {point}
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

