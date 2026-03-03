'use client'

import React from 'react'
import { Heart, AlertCircle, Shield, BarChart3, Users, CheckCircle } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

export default function FeaturesSection() {
  const features = [
    {
      icon: Heart,
      title: 'Medical Examinations',
      points: ['Structured clinical workflows', 'Vital signs & fitness tracking', 'Fitness-for-duty certificates', 'Occupational disease registry'],
    },
    {
      icon: AlertCircle,
      title: 'Incident Management',
      points: ['Real-time incident reporting', 'Investigation workflows', 'Root cause analysis', 'Automated compliance tracking'],
    },
    {
      icon: BarChart3,
      title: 'Risk Assessment',
      points: ['Advanced risk matrix calculations', 'Probability & severity scoring', 'Real-time risk level view', 'Corrective action tracking'],
    },
    {
      icon: Shield,
      title: 'Compliance Management',
      points: ['ISO 45001 & ISO 27001 ready', 'ILO standards alignment', 'Audit trail & reporting', 'Regulatory document store'],
    },
    {
      icon: Users,
      title: 'Worker Management',
      points: ['Enterprise worker profiles', 'Role-based access control', 'Health surveillance programs', 'Training records'],
    },
    {
      icon: CheckCircle,
      title: 'Health Surveillance',
      points: ['Continuous health monitoring', 'Threshold-based alerts', 'Periodic exam scheduling', 'Trend analytics'],
    },
  ]

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="pill bg-successLight text-secondary mb-4">Platform Features</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-4 mt-3 tracking-tight">
            Everything You Need
          </h2>
          <p className="text-lg text-onSurfaceVariant max-w-2xl mx-auto">
            A complete toolset for occupational health professionals — designed for DR Congo workplace realities.
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

