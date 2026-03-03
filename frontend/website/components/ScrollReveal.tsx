'use client'

import React, { useEffect, useRef } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  fade?: boolean
}

export default function ScrollReveal({ children, className = '', delay = 0, fade = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const baseClass = fade ? 'reveal-fade' : 'reveal'
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : ''

  return (
    <div ref={ref} className={`${baseClass} ${delayClass} ${className}`}>
      {children}
    </div>
  )
}
