'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import ScrollReveal from './ScrollReveal'

const images = [
  {
    src: '/images/workers-1.jpg',
    alt: 'Occupational health workers at an industrial site',
  },
  {
    src: '/images/workers-2.jpg',
    alt: 'Mine workers with safety equipment',
  },
  {
    src: '/images/workers-3.jpg',
    alt: 'Industrial workplace safety inspection',
  },
]

export default function GallerySection() {
  const t = useTranslations('gallery')

  return (
    <section className="py-20 bg-gray-50" id="gallery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-14">
            <span className="pill bg-primary/10 text-primary border border-primary/20 mb-4 inline-block">
              {t('badge')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              {t('title')}
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
        </ScrollReveal>

        {/* Image grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {images.map((img, i) => (
            <ScrollReveal key={i} delay={(i + 1) as 1 | 2 | 3 | 4 | 5}>
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-lg group">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
