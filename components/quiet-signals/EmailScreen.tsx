'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { saveUserContact } from '@/lib/quiet-signals/firestore'
import type { UserSession } from '@/lib/quiet-signals/types'

interface EmailScreenProps {
  session: UserSession
  onBack: () => void
  onRestart: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailScreen({ session, onBack, onRestart }: EmailScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const canSubmit = name.trim().length > 1 && EMAIL_PATTERN.test(email.trim()) && consented && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    const contactId = await saveUserContact(
      {
        name,
        email,
        consentToStoreContact: consented,
      },
      session
    )
    setIsSubmitting(false)

    if (!contactId) {
      toast({
        title: 'Could not save contact details',
        description: 'Check that Firebase is configured and Firestore rules are deployed.',
        variant: 'destructive',
      })
      return
    }

    setSubmitted(true)
    toast({
      title: 'Reflection saved',
      description: 'Your contact details and score summary were saved with your consent.',
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
                  Share your name and email if you want Quiet Signals to save your score summary with your contact details.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-ring transition-colors"
                    aria-required="true"
                    aria-label="Name"
                    autoComplete="name"
                    maxLength={80}
                  />
                </div>

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
                    autoComplete="email"
                    maxLength={254}
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
                    I consent to Quiet Signals storing my name, email, and score summary for follow-up. I understand this reflection is not a diagnosis.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    canSubmit ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={canSubmit ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
                  aria-disabled={!canSubmit}
                >
                  {isSubmitting ? 'Saving...' : 'Save my reflection'}
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
                  Your contact details and score summary were saved. You can start a new reflection when ready.
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
