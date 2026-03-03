'use client'

import React from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import BenefitsSection from '@/components/BenefitsSection'
import ModulesSection from '@/components/ModulesSection'
import ComplianceSection from '@/components/ComplianceSection'
import CTASection from '@/components/CTASection'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <ModulesSection />
      <BenefitsSection />
      <ComplianceSection />
      <CTASection />
      <Footer />
    </main>
  )
}
