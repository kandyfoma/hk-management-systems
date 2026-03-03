'use client'

import React from 'react'
import { Heart, AlertCircle, Shield, BarChart3, Users, CheckCircle } from 'lucide-react'

export default function FeaturesSection() {
  const features = [
    {
      icon: Heart,
      title: 'Medical Examinations',
      description: 'Comprehensive occupational health exams with structured clinical workflows, vital signs tracking, and fitness determination.'
    },
    {
      icon: AlertCircle,
      title: 'Incident Management',
      description: 'Real-time incident reporting, investigation workflows, and root cause analysis with automated compliance tracking.'
    },
    {
      icon: BarChart3,
      title: 'Risk Assessment',
      description: 'Advanced risk matrix calculations with probability and severity scoring, real-time risk level determination.'
    },
    {
      icon: Shield,
      title: 'Compliance Management',
      description: 'Multi-standard compliance tracking for ISO 45001, ISO 27001, ILO standards, and local regulations.'
    },
    {
      icon: Users,
      title: 'Worker Management',
      description: 'Enterprise-wide worker profiles, role-based access control, and comprehensive audit trails.'
    },
    {
      icon: CheckCircle,
      title: 'Health Surveillance',
      description: 'Continuous health monitoring programs with threshold-based alerts and automated reporting.'
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
            Comprehensive Features
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to manage occupational health and safety effectively
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition border border-gray-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-accentDark rounded-lg flex items-center justify-center mb-4">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
