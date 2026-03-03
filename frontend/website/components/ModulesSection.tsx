'use client'

import React from 'react'
import { Stethoscope, Volume2, Eye, Wind, Pill, Briefcase } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

export default function ModulesSection() {
  const modules = [
    {
      icon: Stethoscope,
      title: 'Medical Consultations',
      features: ['Patient intake & triage', 'Clinical exams', 'Health tracking', 'Fitness certificates'],
    },
    {
      icon: Volume2,
      title: 'Audiometry Tests',
      features: ['Hearing assessments', 'Trend analysis', 'Compliance reporting', 'Threshold alerts'],
    },
    {
      icon: Eye,
      title: 'Vision Testing',
      features: ['Eye exams', 'Visual acuity tests', 'Color blindness screening', 'Safety clearance'],
    },
    {
      icon: Wind,
      title: 'Spirometry',
      features: ['Lung function tests', 'Respiratory baseline', 'Trend tracking', 'Disease detection'],
    },
    {
      icon: Pill,
      title: 'Drug & Alcohol Tests',
      features: ['Screening programs', 'Compliance testing', 'Results tracking', 'Regulatory reporting'],
    },
    {
      icon: Briefcase,
      title: 'Workplace Incidents',
      features: ['Incident reporting', 'Investigation tools', 'Root cause analysis', 'Prevention tracking'],
    },
  ]

  return (
    <section id="modules" className="py-24 px-4 sm:px-6 lg:px-8 bg-surfaceVariant">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="pill bg-primaryFaded text-primary mb-4">Specialized Modules</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-4 mt-3 tracking-tight">
            Industry-Specific Tools
          </h2>
          <p className="text-lg text-onSurfaceVariant max-w-2xl mx-auto">
            Purpose-built modules for every occupational health testing discipline —
            configured for your workplace standard.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon
            const delay = ((index % 3) + 1) as 1 | 2 | 3
            return (
              <ScrollReveal key={index} delay={delay}>
                <div className="card-lift bg-surface rounded-2xl p-7 border border-outline h-full">
                  <div className="w-11 h-11 bg-gradient-to-br from-primary to-secondaryLight rounded-xl flex items-center justify-center mb-5">
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-4">{module.title}</h3>
                  <ul className="space-y-2">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-onSurfaceVariant">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {feature}
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

