'use client'

import React from 'react'
import { Stethoscope, Ears, Eye, Zap, Pill, Briefcase } from 'lucide-react'

export default function ModulesSection() {
  const modules = [
    {
      icon: Stethoscope,
      title: 'Medical Consultations',
      features: ['Patient intake', 'Clinical exams', 'Health tracking', 'Fitness certificates']
    },
    {
      icon: Ears,
      title: 'Audiometry Tests',
      features: ['Hearing assessments', 'Trend analysis', 'Compliance reporting', 'Threshold alerts']
    },
    {
      icon: Eye,
      title: 'Vision Testing',
      features: ['Eye exams', 'Visual acuity', 'Color blindness tests', 'Safety clearance']
    },
    {
      icon: Zap,
      title: 'Spirometry',
      features: ['Lung function', 'Respiratory tests', 'Baseline tracking', 'Disease detection']
    },
    {
      icon: Pill,
      title: 'Drug & Alcohol Tests',
      features: ['Screening programs', 'Compliance testing', 'Result tracking', 'Reporting']
    },
    {
      icon: Briefcase,
      title: 'Workplace Incidents',
      features: ['Incident reporting', 'Investigation tools', 'Root cause analysis', 'Prevention tracking']
    },
  ]

  return (
    <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
            Specialized Modules
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Industry-specific medical testing and occupational health management modules
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => {
            const Icon = module.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-8 hover:shadow-lg transition border border-gray-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primaryLight rounded-lg flex items-center justify-center mb-4">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">{module.title}</h3>
                <ul className="space-y-2">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-600">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
