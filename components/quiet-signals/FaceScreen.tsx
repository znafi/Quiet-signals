'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera } from 'lucide-react'
import type { SelfConfirmation } from '@/lib/quiet-signals/types'
import { getSelfConfirmationPoints } from '@/lib/quiet-signals/scoring'

interface FaceScreenProps {
  onContinue: (confirmation: SelfConfirmation | null, supportivePoints: number) => void
  onSkip: () => void
  onBack: () => void
}

type Phase = 'idle' | 'scanning' | 'result'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

export default function FaceScreen({ onContinue, onSkip, onBack }: FaceScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(10)
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)

  const startScan = () => {
    setPhase('scanning')
    setCountdown(10)
    let count = 10
    const timer = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(timer)
        setPhase('result')
      }
    }, 1000)
  }

  const handleConfirm = (c: SelfConfirmation) => {
    setConfirmation(c)
  }

  const handleContinue = () => {
    const pts = confirmation ? getSelfConfirmationPoints(confirmation) : 0
    onContinue(confirmation, pts)
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

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-8 text-center"
        >
          <div className="space-y-3">
            <h1
              className="text-4xl md:text-5xl font-light text-foreground text-balance"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Visual signal check
            </h1>
            <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty max-w-sm mx-auto">
              We will use a short camera-based check to look for broad visible cues such as tension, low energy, or pressure activation. This is only supportive context and you can skip it.
            </p>
          </div>

          {/* Camera preview placeholder */}
          <div className="relative mx-auto w-56 h-56 rounded-3xl bg-card border-2 border-warm-border overflow-hidden flex items-center justify-center">
            {/* Face outline rings */}
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-28 rounded-full border-2 border-dashed border-warm-border" aria-hidden="true" />
                    <Camera className="w-6 h-6 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-muted-foreground">Camera preview</p>
                </motion.div>
              )}
              {phase === 'scanning' && (
                <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                  {/* Scanning rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full border border-gold/40"
                      style={{ width: 80 + i * 32, height: 80 + i * 32 }}
                      animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  ))}
                  <div className="relative z-10 text-center">
                    <motion.span
                      className="text-4xl font-light text-gold"
                      style={{ fontFamily: 'var(--font-cormorant)' }}
                      key={countdown}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      aria-live="polite"
                      aria-label={`${countdown} seconds remaining`}
                    >
                      {countdown}
                    </motion.span>
                  </div>
                </motion.div>
              )}
              {phase === 'result' && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 text-center">
                  <motion.div
                    className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'oklch(0.72 0.1 68 / 0.15)' }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    aria-hidden="true"
                  >
                    <div className="w-4 h-4 rounded-full" style={{ background: 'oklch(0.72 0.1 68)' }} />
                  </motion.div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Signal registered</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Simulated result + confirmation */}
          <AnimatePresence>
            {phase === 'result' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div className="p-4 rounded-2xl bg-card border border-warm-border">
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;Possible signs of tension or low energy were noticed.&rdquo;
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Does this feel accurate right now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {confirmationOptions.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleConfirm(key)}
                        className={`p-3 rounded-xl text-sm border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          confirmation === key
                            ? 'border-gold bg-gold/5 text-foreground'
                            : 'border-warm-border bg-card text-muted-foreground hover:border-gold/40'
                        }`}
                        aria-pressed={confirmation === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {confirmation && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleContinue}
                    className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                  >
                    Continue
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start button (idle) */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <button
                onClick={startScan}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                aria-label="Start 10 second visual check"
              >
                Start 10-second check
              </button>
              <button
                onClick={onSkip}
                className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Skip camera check"
              >
                Skip camera check
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="Skip camera check"
            >
              Skip camera check
            </button>
          )}
        </motion.div>
      </section>
    </main>
  )
}
