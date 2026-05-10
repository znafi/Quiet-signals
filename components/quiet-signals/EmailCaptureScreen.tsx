'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { UserContactInfo } from '@/lib/quiet-signals/types'

interface EmailCaptureScreenProps {
  onSubmit: (contactInfo: UserContactInfo) => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailCaptureScreen({ onSubmit }: EmailCaptureScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const canSubmit = trimmedName.length > 1 && EMAIL_PATTERN.test(trimmedEmail) && consented

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ name: trimmedName, email: trimmedEmail, consentToStoreContact: true })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12" role="main">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          {/* Animated orb */}
          <div className="flex justify-center mb-2">
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.62 0.12 70 / 0.12)', border: '1.5px solid oklch(0.62 0.12 70 / 0.35)' }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                {[0, 1].map(i => (
                  <motion.path
                    key={i}
                    d={`M${4 + i * 5},14 Q${8 + i * 5},${9 - i * 2} ${12 + i * 5},14 Q${16 + i * 5},${19 + i * 2} ${20 + i * 5},14`}
                    stroke="oklch(0.62 0.12 70)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.8 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </svg>
            </motion.div>
          </div>

          <h1
            className="text-4xl md:text-5xl font-light text-foreground"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Your reflection is ready
          </h1>
          <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your details to view your full report and save it to your inbox.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="ec-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your name
            </label>
            <input
              id="ec-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              maxLength={80}
              autoComplete="name"
              className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ec-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email address
            </label>
            <input
              id="ec-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              maxLength={254}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <label htmlFor="ec-consent" className="flex items-start gap-3 cursor-pointer group">
            <span className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                id="ec-consent"
                checked={consented}
                onChange={e => setConsented(e.target.checked)}
                className="sr-only"
                aria-label="I consent to Quiet Signals storing my contact details with my score summary"
              />
              <span
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  consented ? 'bg-gold border-gold' : 'border-warm-border bg-background group-hover:border-gold/60'
                }`}
                aria-hidden="true"
              >
                {consented && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              I consent to Quiet Signals storing my name, email, and score summary. I understand this reflection is not a diagnosis.
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            style={canSubmit ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
          >
            View my reflection
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground/60">
          Your data is stored securely and will not be shared with third parties.
        </p>
      </motion.div>
    </main>
  )
}
