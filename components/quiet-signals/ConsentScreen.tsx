'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Mic, FileText, ArrowLeft, Check, Sparkles } from 'lucide-react'
import type { ReflectionMode } from '@/lib/quiet-signals/types'
import { useAccessibility } from '@/hooks/useAccessibility'
import AccessibilityPanel from './AccessibilityPanel'

interface ConsentScreenProps {
  onContinue: (mode: ReflectionMode) => void
  onBack: () => void
}

const modes: {
  key: ReflectionMode
  icon: React.ElementType
  title: string
  description: string
  badge?: string
}[] = [
  {
    key: 'camera-and-voice',
    icon: Sparkles,
    title: 'Add camera & voice signals',
    description: 'Visual and vocal pattern analysis for the most complete reflection.',
    badge: 'Recommended',
  },
  {
    key: 'camera-only',
    icon: Camera,
    title: 'Add camera signal only',
    description: 'On-device facial pattern analysis without voice.',
  },
  {
    key: 'voice-only',
    icon: Mic,
    title: 'Add voice signal only',
    description: 'On-device vocal pattern analysis without camera.',
  },
  {
    key: 'text-only',
    icon: FileText,
    title: 'Continue with scenarios only',
    description: 'Skip optional signals and reflect through scenarios alone.',
  },
]

export default function ConsentScreen({ onContinue, onBack }: ConsentScreenProps) {
  const a11y = useAccessibility()
  const [selectedMode, setSelectedMode] = useState<ReflectionMode | null>(
    a11y.textOnly ? 'text-only' : null,
  )
  const [nonDiag, setNonDiag] = useState(false)
  const [supportive, setSupportive] = useState(false)
  const [consent, setConsent] = useState(false)

  // Text-Only Reflection toggle locks the mode to text-only and disables others.
  useEffect(() => {
    if (a11y.textOnly && selectedMode !== 'text-only') {
      setSelectedMode('text-only')
    }
  }, [a11y.textOnly, selectedMode])

  const handleTextOnlyChange = (enabled: boolean) => {
    if (enabled) setSelectedMode('text-only')
  }

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
          </div>

          {/* Always-included text assessment banner */}
          <div className="p-4 rounded-2xl bg-gold/5 border border-gold/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Scenario-based assessment</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Always included. You&apos;ll respond to workplace scenarios that form the core of your reflection.
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className="text-[10px] uppercase tracking-widest text-gold font-medium bg-gold/10 px-2 py-1 rounded-full">
                  Included
                </span>
              </div>
            </div>
          </div>

          {/* Optional signal modes */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {a11y.textOnly
                ? 'Text Only Reflection is on. Camera and voice are skipped.'
                : 'Optionally add on-device supportive signals for a richer reflection.'}
            </p>
            <fieldset>
              <legend className="sr-only">Select additional signals</legend>
              <div className="space-y-2.5" role="radiogroup" aria-label="Optional signal modes">
                {modes.map(({ key, icon: Icon, title, description, badge }) => {
                  const isSelected = selectedMode === key
                  const isDisabled = a11y.textOnly && key !== 'text-only'
                  return (
                    <motion.button
                      key={key}
                      onClick={() => !isDisabled && setSelectedMode(key)}
                      whileHover={!isDisabled ? { y: -1 } : undefined}
                      whileTap={!isDisabled ? { scale: 0.99 } : undefined}
                      disabled={isDisabled}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        isSelected
                          ? 'border-gold bg-gold/5'
                          : isDisabled
                            ? 'border-warm-border bg-secondary/40 opacity-50 cursor-not-allowed'
                            : 'border-warm-border bg-card hover:border-gold/40'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={isDisabled}
                      aria-label={`${title}: ${description}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-gold/15' : 'bg-secondary'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-muted-foreground'}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{title}</span>
                            {badge && (
                              <span className="text-[9px] uppercase tracking-widest font-medium text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                                {badge}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[9px] uppercase tracking-widest font-medium text-foreground bg-foreground/10 px-1.5 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </fieldset>
          </div>

          {/* Accessibility options panel */}
          <AccessibilityPanel onTextOnlyChange={handleTextOnlyChange} />

          {/* Consent checkboxes */}
          <div className="space-y-3 p-5 rounded-2xl bg-card border border-warm-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Required acknowledgements</p>
            {[
              { id: 'nonDiag', label: 'I understand this is not a diagnosis.', checked: nonDiag, onChange: setNonDiag },
              { id: 'supportive', label: 'I understand camera and voice signals are optional supportive context only.', checked: supportive, onChange: setSupportive },
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

          {/* Safety wording */}
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
            <li>This is not a diagnosis.</li>
            <li>Camera and voice are optional supportive signals.</li>
            <li>You can complete the reflection without camera or voice.</li>
          </ul>

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
