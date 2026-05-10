'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react'

interface ContactScreenProps {
  onBack: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactScreen({ onBack }: ContactScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const trimmedMessage = message.trim()
  const canSubmit =
    trimmedName.length > 1 &&
    EMAIL_PATTERN.test(trimmedEmail) &&
    trimmedMessage.length > 10 &&
    !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    // In a real deployment this would POST to an API route or a form service.
    // For now we simulate a brief async delay and show the success state.
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
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

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto w-full">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6 max-w-sm mx-auto"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.62 0.12 70 / 0.12)' }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: 'oklch(0.62 0.12 70)' }} />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Message sent
              </h1>
              <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you for reaching out. We&apos;ll be in touch at {trimmedEmail}.
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-8 py-3 rounded-full text-sm font-medium border border-warm-border text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Back to home
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-8"
          >
            <div className="text-center space-y-3">
              <h1
                className="text-4xl md:text-5xl font-light text-foreground"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                Contact us
              </h1>
              <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Questions, feedback, or partnership inquiries — we&apos;d love to hear from you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Your name
                  </label>
                  <input
                    id="contact-name"
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
                  <label htmlFor="contact-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email address
                  </label>
                  <input
                    id="contact-email"
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
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Subject <span className="normal-case text-muted-foreground/60 ml-1 text-[10px]">optional</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Partnership, feedback, question…"
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  required
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors resize-none"
                />
                <p className="text-[10px] text-muted-foreground/60 text-right">
                  {trimmedMessage.length} / 2000
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={canSubmit ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
              >
                {submitting ? (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </motion.div>
        )}
      </section>
    </main>
  )
}
