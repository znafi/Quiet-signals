'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, MicOff } from 'lucide-react'
import type { SelfConfirmation } from '@/lib/quiet-signals/types'
import { getSelfConfirmationPoints } from '@/lib/quiet-signals/scoring'

interface VoiceScreenProps {
  onContinue: (confirmation: SelfConfirmation | null, supportivePoints: number) => void
  onSkip: () => void
  onBack: () => void
}

type Phase = 'idle' | 'recording' | 'result'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

// Animated waveform bars
function WaveForm() {
  return (
    <div className="flex items-center gap-1 h-10" aria-hidden="true" role="presentation">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: 'oklch(0.62 0.12 70)' }}
          animate={{
            height: [6, 8 + Math.sin(i * 0.8) * 18 + 8, 6],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6 + (i % 5) * 0.1,
            repeat: Infinity,
            delay: (i * 0.05) % 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default function VoiceScreen({ onContinue, onSkip, onBack }: VoiceScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)

  const startRecording = () => {
    setPhase('recording')
    // Simulate recording for 3 seconds then show result
    setTimeout(() => {
      setPhase('result')
    }, 3000)
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
              Voice reflection
            </h1>
            <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
          </div>

          <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2">
            <p
              className="text-xl font-light text-foreground"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              &ldquo;Describe one workplace moment recently that stayed with you.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can speak for 20 to 30 seconds. Quiet Signals will look for broad supportive cues such as pace, pauses, hesitation, and energy. This does not diagnose you.
            </p>
          </div>

          {/* Mic visualization */}
          <div className="flex flex-col items-center gap-6">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-24 h-24 rounded-full bg-secondary border-2 border-warm-border flex items-center justify-center"
                  aria-hidden="true"
                >
                  <MicOff className="w-10 h-10 text-muted-foreground" />
                </motion.div>
              )}

              {phase === 'recording' && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0.62 0.12 70 / 0.12)', border: '2px solid oklch(0.62 0.12 70 / 0.4)' }}
                    animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0 0 oklch(0.62 0.12 70 / 0)', '0 0 0 16px oklch(0.62 0.12 70 / 0.06)', '0 0 0 0 oklch(0.62 0.12 70 / 0)'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    <Mic className="w-10 h-10" style={{ color: 'oklch(0.62 0.12 70)' }} />
                  </motion.div>
                  <WaveForm />
                  <p className="text-sm text-muted-foreground" aria-live="polite" aria-label="Recording in progress">Listening…</p>
                </motion.div>
              )}

              {phase === 'result' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: 'oklch(0.62 0.12 70 / 0.1)', border: '2px solid oklch(0.62 0.12 70 / 0.3)' }}
                  aria-hidden="true"
                >
                  <Mic className="w-10 h-10" style={{ color: 'oklch(0.62 0.12 70)' }} />
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
                    &ldquo;Your voice reflection suggests this topic may carry some pressure.&rdquo;
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Does this feel accurate right now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {confirmationOptions.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setConfirmation(key)}
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

          {/* Start / Skip buttons */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <button
                onClick={startRecording}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                aria-label="Start voice reflection recording"
              >
                Start voice reflection
              </button>
              <button
                onClick={onSkip}
                className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Skip voice reflection"
              >
                Skip voice reflection
              </button>
            </div>
          )}

          {phase === 'recording' && (
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="Skip voice reflection"
            >
              Skip voice reflection
            </button>
          )}
        </motion.div>
      </section>
    </main>
  )
}
