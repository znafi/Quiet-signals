'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Copy, ArrowLeft, CheckCircle } from 'lucide-react'

interface PathwayScreenProps {
  onSelectIndividual: () => void
  onBack: () => void
}

export default function PathwayScreen({ onSelectIndividual, onBack }: PathwayScreenProps) {
  const [showOrg, setShowOrg] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('connect@urbanconsciousness.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback silently
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      {/* Back */}
      <div className="px-6 pt-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back to landing page"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        {!showOrg ? (
          <motion.div
            key="pathway"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-8"
          >
            <div className="text-center space-y-2">
              <h1
                className="text-4xl md:text-5xl font-light text-foreground text-balance"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                What kind of support are you exploring?
              </h1>
              <div className="w-10 h-px bg-gold mx-auto mt-3" aria-hidden="true" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Individual card */}
              <motion.button
                onClick={onSelectIndividual}
                whileHover={{ y: -2, boxShadow: '0 8px 32px oklch(0.62 0.12 70 / 0.12)' }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2 }}
                className="group p-6 rounded-2xl bg-card border-2 border-warm-border hover:border-gold text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Select: For myself as a leader or professional"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-gold/10 transition-colors">
                  <User className="w-5 h-5 text-gold" aria-hidden="true" />
                </div>
                <h2 className="font-medium text-foreground text-lg mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  For myself as a leader or professional
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reflect on your own workplace pressure patterns and receive a suggested next step.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold group-hover:gap-2.5 transition-all">
                  Continue
                  <span aria-hidden="true">→</span>
                </div>
              </motion.button>

              {/* Organization card */}
              <motion.button
                onClick={() => setShowOrg(true)}
                whileHover={{ y: -2, boxShadow: '0 8px 32px oklch(0.62 0.12 70 / 0.12)' }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2 }}
                className="group p-6 rounded-2xl bg-card border-2 border-warm-border hover:border-gold text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Select: For my organization or team"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-gold/10 transition-colors">
                  <Building2 className="w-5 h-5 text-gold" aria-hidden="true" />
                </div>
                <h2 className="font-medium text-foreground text-lg mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  For my organization or team
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Explore leadership development support for a group, team, or workplace.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold group-hover:gap-2.5 transition-all">
                  Request consult
                  <span aria-hidden="true">→</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="org"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg mx-auto space-y-6 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7 text-gold" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <h1
                className="text-3xl md:text-4xl font-light text-foreground text-balance"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Organizational support
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                Thank you for your interest in organizational leadership development support. At this stage, organizational support is handled through direct consultation. Please contact us to discuss leadership development support for your team or organization.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-4">
              <p className="text-sm font-medium text-foreground">connect@urbanconsciousness.com</p>
              <button
                onClick={handleCopyEmail}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium mx-auto transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
              >
                {copied ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied ? 'Copied!' : 'Copy email'}
              </button>
            </div>

            <button
              onClick={() => setShowOrg(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="Back to pathway selection"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to start
            </button>
          </motion.div>
        )}
      </section>
    </main>
  )
}
