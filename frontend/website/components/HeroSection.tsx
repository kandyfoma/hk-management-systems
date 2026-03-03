'use client'

import React from 'react'
import { ArrowRight, Shield, Zap } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary via-primaryLight to-primaryDark text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Occupational Health Management Made Simple
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Comprehensive workplace health and safety platform. Manage medical examinations, risk assessments, incident reporting, and regulatory compliance all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href="https://app.katohms.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-secondaryLight hover:bg-accent text-primary font-bold transition transform hover:scale-105"
              >
                Get Started <ArrowRight size={20} />
              </a>
              <button
                onClick={() => {
                  const element = document.getElementById('features')
                  element?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg border-2 border-white text-white hover:bg-white hover:text-primary font-bold transition"
              >
                Learn More
              </button>
            </div>

            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield size={20} />
                <span>Enterprise-Grade Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={20} />
                <span>Real-Time Monitoring</span>
              </div>
            </div>
          </div>

          {/* Image/Visual */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondaryLight mb-2">500+</div>
                  <div className="text-sm text-white/70">Enterprises</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondaryLight mb-2">50K+</div>
                  <div className="text-sm text-white/70">Workers Managed</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondaryLight mb-2">99.9%</div>
                  <div className="text-sm text-white/70">Uptime</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-secondaryLight mb-2">24/7</div>
                  <div className="text-sm text-white/70">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
