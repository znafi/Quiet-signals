'use client'

import { Eye, FileText, Type, Wind, Settings2 } from 'lucide-react'
import { useAccessibility, type AccessibilityPrefs } from '@/hooks/useAccessibility'

interface AccessibilityPanelProps {
  /** Optional callback fired when Text Only Reflection is toggled. */
  onTextOnlyChange?: (enabled: boolean) => void
}

interface ToggleDef {
  key: keyof AccessibilityPrefs
  title: string
  description: string
  icon: React.ElementType
}

const toggles: ToggleDef[] = [
  {
    key: 'textOnly',
    title: 'Text Only Reflection',
    description: 'Skip camera and voice. Complete the full reflection through scenarios only.',
    icon: FileText,
  },
  {
    key: 'calm',
    title: 'Calm Experience',
    description: 'Reduce motion, pulses, and countdown pressure for a quieter session.',
    icon: Wind,
  },
  {
    key: 'largerText',
    title: 'Larger Text',
    description: 'Increase text size, spacing, and tap targets across the app.',
    icon: Type,
  },
  {
    key: 'highContrast',
    title: 'High Contrast',
    description: 'Strengthen text, borders, and focus rings for easier reading.',
    icon: Eye,
  },
]

export default function AccessibilityPanel({ onTextOnlyChange }: AccessibilityPanelProps) {
  const a11y = useAccessibility()

  const handleToggle = (key: keyof AccessibilityPrefs) => {
    const next = !a11y[key]
    a11y.setPref(key, next)
    if (key === 'textOnly') onTextOnlyChange?.(next)
  }

  return (
    <fieldset
      className="p-5 rounded-2xl bg-card border border-warm-border space-y-3"
      aria-labelledby="a11y-panel-heading"
    >
      <legend id="a11y-panel-heading" className="sr-only">
        Accessibility options
      </legend>
      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-gold" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Accessibility options
        </p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Optional. Tune the experience to feel comfortable. You can change these any time.
      </p>

      <ul className="space-y-2 list-none pl-0">
        {toggles.map(({ key, title, description, icon: Icon }) => {
          const enabled = a11y[key]
          const switchId = `a11y-toggle-${key}`
          const descId = `${switchId}-desc`
          return (
            <li key={key}>
              <button
                type="button"
                id={switchId}
                role="switch"
                aria-checked={enabled}
                aria-describedby={descId}
                onClick={() => handleToggle(key)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  enabled
                    ? 'border-gold bg-gold/5'
                    : 'border-warm-border bg-background hover:border-gold/40'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    enabled ? 'bg-gold/15' : 'bg-secondary'
                  }`}
                  aria-hidden="true"
                >
                  <Icon className={`w-4 h-4 ${enabled ? 'text-gold' : 'text-muted-foreground'}`} />
                </span>
                <span className="flex-1 min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">{title}</span>
                  <span id={descId} className="block text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </span>
                </span>
                {/* Pill-style switch — visible state independent of color */}
                <span
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 mt-1 rounded-full border-2 transition-colors ${
                    enabled ? 'bg-gold border-gold' : 'bg-background border-warm-border'
                  }`}
                  aria-hidden="true"
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-card border border-warm-border transition-all ${
                      enabled ? 'left-[1.25rem]' : 'left-0.5'
                    }`}
                  />
                  <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
