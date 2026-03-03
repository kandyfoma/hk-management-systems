'use client'

import React from 'react'
import { ArrowRight, Shield, Zap, MapPin } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primaryLight to-primaryDark text-white overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div>
            <ScrollReveal>
              <div className="flex items-center gap-2 mb-6">
                <MapPin size={14} className="text-secondaryLight" />
                <span className="pill bg-white/10 text-secondaryLight border border-secondaryLight/30">
                  Lubumbashi · DR Congo
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Occupational Health<br />
                Management<br />
                <span className="gradient-text">System</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={2}>
              <p className="text-lg sm:text-xl text-white/75 mb-10 leading-relaxed max-w-xl">
                Comprehensive workplace health &amp; safety system built for
                DR Congo enterprises. Manage medical examinations, risk assessments,
                incident reporting, and regulatory compliance — all in one platform.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={3}>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href="https://app.katohms.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-secondaryLight hover:bg-accent text-primary font-bold text-base transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-secondaryLight/20"
                >
                  Get Started Free <ArrowRight size={18} />
                </a>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 font-bold text-base transition-all duration-200"
                >
                  See Features
                </button>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={4}>
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-secondaryLight" />
                  <span>ISO 45001 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-secondaryLight" />
                  <span>Real-Time Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-secondaryLight" />
                  <span>Enterprise Security</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Stats card */}
          <ScrollReveal delay={2} className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">Platform at a Glance</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '500+', label: 'Enterprises' },
                  { value: '50K+', label: 'Workers Managed' },
                  { value: '99.9%', label: 'System Uptime' },
                  { value: '24/7', label: 'Expert Support' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/10 hover:bg-white/15 transition rounded-xl p-5 text-center">
                    <div className="text-3xl font-extrabold text-secondaryLight mb-1">{stat.value}</div>
                    <div className="text-xs text-white/60 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-white/50">Trusted locally in</span>
                <span className="font-semibold text-secondaryLight">Lubumbashi, DR Congo</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
