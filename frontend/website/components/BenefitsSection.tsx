'use client'

import React from 'react'
import { TrendingUp, Lock, Clock, BarChart3 } from 'lucide-react'

export default function BenefitsSection() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Improved Worker Health',
      description: 'Proactive health monitoring leads to early detection of workplace-related health issues and better overall worker wellness.'
    },
    {
      icon: Lock,
      title: 'Regulatory Compliance',
      description: 'Automated compliance tracking ensures adherence to ISO 45001, ILO standards, and local occupational health regulations.'
    },
    {
      icon: Clock,
      title: 'Time Efficiency',
      description: 'Streamlined workflows reduce administrative burden by 70%, freeing up time for critical health and safety tasks.'
    },
    {
      icon: BarChart3,
      title: 'Better Decision Making',
      description: 'Real-time dashboards and advanced analytics provide actionable insights for strategic occupational health planning.'
    },
  ]

  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
            Key Benefits
          </h2>
          <p className="text-xl text-onSurfaceVariant max-w-2xl mx-auto">
            Transform your occupational health management with measurable results
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-secondaryLight to-secondaryDark rounded-xl flex items-center justify-center">
                    <Icon size={28} className="text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">{benefit.title}</h3>
                  <p className="text-onSurfaceVariant leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 bg-gradient-to-r from-primary to-primaryDark rounded-xl p-12 text-white">
          <h3 className="text-2xl font-bold mb-6">Why Choose KAT OHMS?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-secondaryLight mb-2">99.9%</div>
              <p className="text-white/80">System Uptime Guarantee</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondaryLight mb-2">24/7</div>
              <p className="text-white/80">Priority Technical Support</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondaryLight mb-2">GDPR</div>
              <p className="text-white/80">Data Protection Compliant</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
