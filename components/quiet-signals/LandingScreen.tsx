'use client'

import { motion } from 'framer-motion'
import { Shield, Mic, Camera, Brain, Lock, ChevronRight } from 'lucide-react'

interface LandingScreenProps {
  onStart: () => void
  onHowItWorks: () => void
}

const badges = [
  { icon: Camera, label: 'Camera optional' },
  { icon: Mic, label: 'Voice optional' },
  { icon: Brain, label: 'Low cognitive load' },
  { icon: ChevronRight, label: 'Leadership focused' },
  { icon: Lock, label: 'Private by design' },
]

// Quiet signal wave SVG
function SignalOrb() {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto">
      {/* Outer rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-amber/30"
          style={{ width: 80 + i * 48, height: 80 + i * 48 }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + i * 0.8, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
        />
      ))}
      {/* Core orb */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'oklch(0.72 0.1 68 / 0.15)', border: '1.5px solid oklch(0.72 0.1 68 / 0.4)' }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Signal waves inside */}
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d={`M${8 + i * 8},20 Q${12 + i * 8},${12 - i * 3} ${16 + i * 8},20 Q${20 + i * 8},${28 + i * 3} ${24 + i * 8},20`}
              stroke="oklch(0.62 0.12 70)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              animate={{ opacity: [0.4, 1, 0.4], pathLength: [0.8, 1, 0.8] }}
              transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  )
}

export default function LandingScreen({ onStart, onHowItWorks }: LandingScreenProps) {
  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-gold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: 'var(--font-inter)' }}>
            Urban Consciousness
          </span>
        </div>
        <button
          onClick={onHowItWorks}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="See how Quiet Signals works"
        >
          How it works
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20 text-center max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <SignalOrb />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="mt-8 space-y-2"
        >
          <h1
            className="text-5xl md:text-7xl font-light tracking-tight text-foreground text-balance leading-tight"
            style={{ fontFamily: 'var(--font-cormorant)', letterSpacing: '-0.01em' }}
          >
            Quiet Signals
          </h1>
          <div className="w-12 h-px bg-gold mx-auto mt-4" aria-hidden="true" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
          className="mt-8 space-y-4"
        >
          <p className="text-2xl md:text-3xl font-light text-foreground text-balance leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Notice what pressure is trying to tell you.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed text-pretty max-w-xl mx-auto">
            A private leadership reflection tool that helps you recognize hidden pressure patterns and find the right next step.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
          className="mt-10 flex flex-col sm:flex-row gap-3 items-center"
        >
          <button
            onClick={onStart}
            className="group relative px-8 py-4 rounded-full text-sm font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            style={{
              background: 'oklch(0.62 0.12 70)',
              color: 'oklch(0.985 0.004 80)',
            }}
            aria-label="Start your private reflection"
          >
            <span className="relative z-10">Start private reflection</span>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'oklch(0.55 0.12 70)' }}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          </button>
          <button
            onClick={onHowItWorks}
            className="px-8 py-4 rounded-full text-sm font-medium tracking-wide border border-warm-border text-foreground hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="See how Quiet Signals works"
          >
            See how it works
          </button>
        </motion.div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-5 text-xs text-muted-foreground flex items-center gap-2"
        >
          <Shield className="w-3.5 h-3.5 text-sage flex-shrink-0" aria-hidden="true" />
          Not a diagnosis. Not a test. A reflective tool for understanding leadership pressure.
        </motion.p>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-10 flex flex-wrap justify-center gap-2"
          role="list"
          aria-label="App features"
        >
          {badges.map(({ icon: Icon, label }) => (
            <span
              key={label}
              role="listitem"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-warm-border bg-card"
            >
              <Icon className="w-3 h-3 text-gold" aria-hidden="true" />
              {label}
            </span>
          ))}
        </motion.div>

        {/* Explainer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-12 max-w-lg mx-auto p-6 rounded-2xl bg-card border border-warm-border shadow-sm"
        >
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Some pressure patterns are loud. Others are quiet. Quiet Signals helps you notice the ones that often go unnamed.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 px-6">
        <p className="text-xs text-muted-foreground">
          Quiet Signals is a non-diagnostic leadership reflection prototype created for natIgnite 2026 AccessTech.
        </p>
      </footer>
    </main>
  )
}
