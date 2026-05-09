'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Mic, FileText, ArrowLeft, Check } from 'lucide-react'
import type { ReflectionMode } from '@/lib/quiet-signals/types'

interface ConsentScreenProps {
  onContinue: (mode: ReflectionMode) => void
  onBack: () => void
}

const modes: { key: ReflectionMode; icon: React.ElementType; title: string; description: string; disabled?: boolean }[] = [
  {
    key: 'camera-and-voice',
    icon: Camera,
    title: 'Use camera and voice (Coming soon)',
    description: 'Optional visual and voice based supportive signals are not available yet.',
    disabled: true,
  },
  {
    key: 'voice-only',
    icon: Mic,
    title: 'Use voice only (Coming soon)',
    description: 'A short voice reflection without camera is not available yet.',
    disabled: true,
  },
  {
    key: 'text-only',
    icon: FileText,
    title: 'Skip and continue with text only',
    description: 'Complete the full reflection using scenario responses only.',
  },
]

export default function ConsentScreen({ onContinue, onBack }: ConsentScreenProps) {
  const [selectedMode, setSelectedMode] = useState<ReflectionMode | null>(null)
  const [nonDiag, setNonDiag] = useState(false)
  const [supportive, setSupportive] = useState(false)
  const [consent, setConsent] = useState(false)

  const canContinue = selectedMode !== null && nonDiag && supportive && consent

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
          className="w-full space-y-8"
        >
          <div className="text-center space-y-3">
            <h1
              className="text-4xl md:text-5xl font-light text-foreground text-balance"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Choose how you want to reflect
            </h1>
            <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              Quiet Signals currently uses scenario responses as the main reflection. Camera and voice inputs are coming soon and will provide optional supportive context only.
            </p>
          </div>

          {/* Mode cards */}
          <fieldset>
            <legend className="sr-only">Select your reflection mode</legend>
            <div className="space-y-3">
              {modes.map(({ key, icon: Icon, title, description, disabled }) => {
                const isSelected = selectedMode === key
                return (
                  <motion.button
                    key={key}
                    onClick={() => !disabled && setSelectedMode(key)}
                    disabled={disabled}
                    whileHover={disabled ? {} : { y: -1 }}
                    whileTap={disabled ? {} : { scale: 0.99 }}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      isSelected
                        ? 'border-gold bg-gold/5'
                        : disabled
                          ? 'border-warm-border bg-card opacity-60 cursor-not-allowed'
                          : 'border-warm-border bg-card hover:border-gold/40'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={disabled}
                    aria-label={`${title}: ${description}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-gold/15' : 'bg-secondary'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-muted-foreground'}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{title}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center flex-shrink-0" aria-hidden="true">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </fieldset>

          {/* Microcopy */}
          <p className="text-xs text-center text-muted-foreground italic">
            You can receive a complete result with text-only scenario responses.
          </p>

          {/* Consent checkboxes */}
          <div className="space-y-3 p-5 rounded-2xl bg-card border border-warm-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Required acknowledgements</p>
            {[
              { id: 'nonDiag', label: 'I understand this is not a diagnosis.', checked: nonDiag, onChange: setNonDiag },
              { id: 'supportive', label: 'I understand camera and voice supportive signals are coming soon.', checked: supportive, onChange: setSupportive },
              { id: 'consentGiven', label: 'I consent to continue with the selected reflection mode.', checked: consent, onChange: setConsent },
            ].map(({ id, label, checked, onChange }) => (
              <label key={id} htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only"
                    aria-label={label}
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                      checked ? 'bg-gold border-gold' : 'border-warm-border bg-background group-hover:border-gold/60'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">{label}</span>
              </label>
            ))}
          </div>

          {/* Continue button */}
          <motion.button
            onClick={() => canContinue && onContinue(selectedMode!)}
            disabled={!canContinue}
            whileHover={canContinue ? { scale: 1.01 } : {}}
            whileTap={canContinue ? { scale: 0.99 } : {}}
            className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              canContinue
                ? 'cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
            style={canContinue ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
            aria-disabled={!canContinue}
          >
            Continue to reflection
          </motion.button>
        </motion.div>
      </section>
    </main>
  )
}
