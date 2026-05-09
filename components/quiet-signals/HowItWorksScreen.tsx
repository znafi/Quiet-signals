'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Layers, Waves, GitBranch, Play } from 'lucide-react'

interface HowItWorksScreenProps {
  onBack: () => void
  onRunDemo: (profile: 'coaching' | 'mixed' | 'strain') => void
}

const features = [
  {
    icon: Layers,
    title: 'Scenario-based core',
    body: 'Workplace scenarios reveal repeated pressure patterns without requiring users to already have the language.',
    color: 'oklch(0.62 0.12 70)',
  },
  {
    icon: Waves,
    title: 'Optional supportive signals',
    body: 'Camera and voice reflections provide context only and never diagnose or decide the result alone.',
    color: 'oklch(0.60 0.07 148)',
  },
  {
    icon: GitBranch,
    title: 'Pathway routing',
    body: 'The tool routes users toward coaching, therapy, mixed support, or organizational consult based on repeated patterns.',
    color: 'oklch(0.65 0.1 50)',
  },
]

const demoProfiles: { key: 'coaching' | 'mixed' | 'strain'; label: string; description: string; color: string }[] = [
  {
    key: 'coaching',
    label: 'Run coaching-ready sample',
    description: 'High pattern recognition, expansion readiness, and re-engagement. Routes to 1:1 coaching.',
    color: 'oklch(0.62 0.12 70)',
  },
  {
    key: 'mixed',
    label: 'Run mixed support sample',
    description: 'Elevated capacity narrowing with moderate coaching readiness. Routes to coaching with added support.',
    color: 'oklch(0.65 0.1 50)',
  },
  {
    key: 'strain',
    label: 'Run elevated strain sample',
    description: 'High capacity narrowing, repeated shutdown and self-worth indicators. Routes to therapeutic support.',
    color: 'oklch(0.60 0.07 148)',
  },
]

export default function HowItWorksScreen({ onBack, onRunDemo }: HowItWorksScreenProps) {
  return (
    <main className="min-h-screen bg-background pb-20" role="main">
      {/* Back */}
      <div className="px-6 pt-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <p className="text-xs tracking-widest uppercase text-gold font-medium">natIgnite 2026 AccessTech</p>
          <h1
            className="text-4xl md:text-5xl font-light text-foreground text-balance"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            How Quiet Signals Works
          </h1>
          <div className="w-12 h-px bg-gold" aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty max-w-lg">
            Quiet Signals is a multimodal leadership pressure reflection tool that uses scenario-based pattern recognition as its core evaluation engine. Optional face and voice inputs provide supportive context only.
          </p>
        </motion.div>

        {/* How it works cards */}
        <section aria-label="How it works">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, body, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-card border border-warm-border space-y-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}18` }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h2 className="font-medium text-foreground text-base leading-snug" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Scoring weights */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          aria-label="Scoring weights"
          className="p-6 rounded-2xl bg-card border border-warm-border space-y-4"
        >
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Scoring inputs</h2>
          <div className="space-y-3">
            {[
              { label: 'Scenario-based responses', weight: 70 },
              { label: 'Self-confirmation after face reflection', weight: 15 },
              { label: 'Voice-based supportive reflection', weight: 10 },
              { label: 'Face-based supportive reflection', weight: 5 },
            ].map(({ label, weight }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{weight}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'oklch(0.62 0.12 70)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${weight}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Judge demo mode */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          aria-label="Judge demo mode"
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.72 0.1 68 / 0.15)' }}
              aria-hidden="true"
            >
              <Play className="w-4 h-4" style={{ color: 'oklch(0.62 0.12 70)' }} />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Judge Demo Mode
              </h2>
              <p className="text-xs text-muted-foreground">Run a pre-filled profile to see the results screen instantly.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {demoProfiles.map(({ key, label, description, color }, i) => (
              <motion.button
                key={key}
                onClick={() => onRunDemo(key)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.45 + i * 0.08 }}
                className="p-4 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ borderColor: `${color}50`, background: `${color}08` }}
                aria-label={label}
              >
                <div
                  className="w-2 h-2 rounded-full mb-3"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-foreground mb-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="p-5 rounded-2xl bg-secondary border border-warm-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            Quiet Signals does not store sensitive data, does not analyze camera or voice in the current prototype, and camera and voice signals are optional and supportive only. This reflection is not a diagnosis.
          </p>
        </motion.div>
      </div>
    </main>
  )
}
