'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function ComplianceSection() {
  const standards = [
    {
      name: 'ISO 45001',
      description: 'Occupational Health & Safety Management System',
      features: ['Risk assessment', 'Incident reporting', 'Compliance tracking', 'Performance evaluation']
    },
    {
      name: 'ISO 27001',
      description: 'Information Security Management',
      features: ['Data encryption', 'Access controls', 'Audit logging', 'Vulnerability management']
    },
    {
      name: 'ILO Standards',
      description: 'International Labour Organization',
      features: ['C155 Convention', 'C161 Convention', 'R194 Recommendation', 'Disease registry']
    },
    {
      name: 'GDPR/CCPA',
      description: 'Data Privacy & Protection',
      features: ['Data subjects rights', 'Consent management', 'Data retention', 'Breach notification']
    },
  ]

  return (
    <section id="compliance" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
            Full Compliance Ready
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built from the ground up to meet international standards and regulatory requirements
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {standards.map((standard, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition"
            >
              <h3 className="text-2xl font-bold text-primary mb-2">{standard.name}</h3>
              <p className="text-gray-600 text-sm mb-6">{standard.description}</p>
              <ul className="space-y-3">
                {standard.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-accent flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-50 rounded-xl p-8 border border-blue-200">
          <h3 className="text-2xl font-bold text-primary mb-4">Certifications & Compliance</h3>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-accent mb-2">✓</div>
              <p className="font-semibold text-primary">ISO 45001</p>
              <p className="text-sm text-gray-600">Certified</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">✓</div>
              <p className="font-semibold text-primary">ISO 27001</p>
              <p className="text-sm text-gray-600">Certified</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">✓</div>
              <p className="font-semibold text-primary">GDPR</p>
              <p className="text-sm text-gray-600">Compliant</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">✓</div>
              <p className="font-semibold text-primary">ILO</p>
              <p className="text-sm text-gray-600">Standards</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
