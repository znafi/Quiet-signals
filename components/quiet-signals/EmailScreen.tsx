'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface EmailScreenProps {
  onBack: () => void
  onRestart: () => void
}

export default function EmailScreen({ onBack, onRestart }: EmailScreenProps) {
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !consented) return
    setSubmitted(true)
    toast({
      title: 'Reflection saved for demo.',
      description: 'No real email was sent in this prototype.',
    })
  }

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      <Toaster />
      <div className="px-6 pt-6 md:px-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back to results"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to results
        </button>
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-8"
        >
          {!submitted ? (
            <>
              <div className="text-center space-y-3">
                <h1
                  className="text-4xl md:text-5xl font-light text-foreground text-balance"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  Want a copy of your reflection?
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your email to receive your Quiet Signals summary and next step.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-ring transition-colors"
                    aria-required="true"
                    aria-label="Email address"
                  />
                </div>

                <label htmlFor="email-consent" className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      id="email-consent"
                      checked={consented}
                      onChange={(e) => setConsented(e.target.checked)}
                      className="sr-only"
                      aria-label="I consent to being contacted about this reflection"
                    />
                    <div
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
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    I consent to being contacted about this reflection.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!email || !consented}
                  className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    email && consented ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={email && consented ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
                  aria-disabled={!email || !consented}
                >
                  Send my reflection
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'oklch(0.62 0.12 70 / 0.12)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'oklch(0.62 0.12 70)' }} aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Reflection saved
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reflection saved for demo. No real email was sent in this prototype.
                </p>
              </div>
              <button
                onClick={onRestart}
                className="px-8 py-3 rounded-full text-sm font-medium border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Start a new reflection"
              >
                Start a new reflection
              </button>
            </motion.div>
          )}
        </motion.div>
      </section>
    </main>
  )
}
