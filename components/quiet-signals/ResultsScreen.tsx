'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Download, RotateCcw, CheckCircle, ArrowRight, Camera, Mic, FileText } from 'lucide-react'
import type { UserSession } from '@/lib/quiet-signals/types'
import {
  getPatternName,
  getPatternDescription,
  getTopCulturalTags,
  normalizeScore,
  getScoreLevel,
  copyResultSummary,
} from '@/lib/quiet-signals/scoring'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface ResultsScreenProps {
  session: UserSession
  onEmailCapture: () => void
  onRestart: () => void
}

const dimensionLabels: Record<string, string> = {
  patternRigidity: 'Pattern Rigidity',
  patternRecognition: 'Pattern Recognition',
  reEngagement: 'Re-engagement Capacity',
  expansionReadiness: 'Expansion Readiness',
  capacityNarrowing: 'Capacity Narrowing',
}

const dimensionColors: Record<string, string> = {
  patternRigidity: 'oklch(0.65 0.1 50)',
  patternRecognition: 'oklch(0.60 0.07 148)',
  reEngagement: 'oklch(0.62 0.12 70)',
  expansionReadiness: 'oklch(0.62 0.12 70)',
  capacityNarrowing: 'oklch(0.62 0.1 46)',
}

const routeConfig = {
  coaching: {
    title: 'Suggested next step: 1:1 Leadership Coaching',
    message:
      'Your responses suggest that you may be experiencing repeated leadership pressure patterns, but you also show signs of awareness, reflection, and readiness to respond differently. 1:1 leadership coaching may help you identify what takes over under pressure and expand the behavioral range available to you in real leadership moments.',
    primaryButton: 'Book a coaching consult',
    color: 'oklch(0.62 0.12 70)',
  },
  therapy: {
    title: 'Suggested next step: Therapeutic Support',
    message:
      'Your responses suggest that some workplace experiences may be carrying a level of emotional strain that goes beyond leadership development alone. Therapeutic support may help strengthen emotional regulation, recovery capacity, and self-trust before or alongside professional growth.',
    primaryButton: 'Explore therapy support',
    color: 'oklch(0.60 0.07 148)',
  },
  mixed: {
    title: 'Suggested next step: Coaching with added support',
    message:
      'Your responses show both leadership growth potential and signs that certain pressure moments may carry a deeper emotional load. Coaching may be helpful, and therapeutic support may also be worth considering if these patterns feel difficult to recover from or are affecting your wellbeing.',
    primaryButton: 'Explore coaching',
    color: 'oklch(0.62 0.12 70)',
  },
}

function PatternBar({ label, score, max = 16, color }: { label: string; score: number; max?: number; color: string }) {
  const normalized = normalizeScore(score, max)
  const level = getScoreLevel(normalized)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{level}</span>
      </div>
      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${normalized}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}

export default function ResultsScreen({ session, onEmailCapture, onRestart }: ResultsScreenProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const patternName = getPatternName(session)
  const description = getPatternDescription(patternName)
  const topTags = getTopCulturalTags(session)
  const route = session.finalRoute || 'coaching'
  const routeInfo = routeConfig[route as keyof typeof routeConfig] || routeConfig.coaching

  const handleCopy = async () => {
    const ok = await copyResultSummary(session)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      toast({ title: 'Summary copied', description: 'Your reflection summary has been copied to clipboard.' })
    }
  }

  const handleDownload = () => {
    toast({ title: 'Summary prepared for demo.', description: 'No real data was saved in this prototype.' })
  }

  return (
    <main className="min-h-screen bg-background pb-20" role="main">
      <Toaster />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-warm-border px-6 py-4 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div className="w-2 h-2 rounded-full bg-gold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground tracking-widest uppercase" style={{ fontFamily: 'var(--font-inter)' }}>
            Quiet Signals
          </span>
        </div>
        <button
          onClick={onRestart}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Start over"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Start over
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-1">
          <p className="text-xs tracking-widest uppercase text-gold font-medium">Your Quiet Signals Reflection</p>
          <h1 className="text-4xl md:text-5xl font-light text-foreground text-balance leading-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {patternName}
          </h1>
          <div className="w-12 h-px bg-gold mt-3" aria-hidden="true" />
        </motion.div>

        {/* What may be happening */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-2">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">What may be happening</h2>
          <p className="text-sm text-foreground leading-relaxed text-pretty">{description}</p>
        </motion.div>

        {/* Supportive signals */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Supportive signals</h2>
          <div className="space-y-3">
            {session.faceSignal.used ? (
              <div className="flex items-start gap-3">
                <Camera className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Visual check: possible tension or low energy signal, self-confirmed as{' '}
                  <span className="text-foreground font-medium">{session.faceSignal.selfConfirmation ?? 'not confirmed'}</span>.
                </p>
              </div>
            ) : null}
            {session.voiceSignal.used ? (
              <div className="flex items-start gap-3">
                <Mic className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Voice reflection: possible pressure signal, self-confirmed as{' '}
                  <span className="text-foreground font-medium">{session.voiceSignal.selfConfirmation ?? 'not confirmed'}</span>.
                </p>
              </div>
            ) : null}
            {!session.faceSignal.used && !session.voiceSignal.used && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Camera and voice were skipped. Your result is based on scenario responses only.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pattern map */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-5">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Pattern map</h2>
          <div className="space-y-4" role="list" aria-label="Dimension scores">
            {Object.entries(session.dimensionScores).map(([key, score]) => (
              <div key={key} role="listitem">
                <PatternBar
                  label={dimensionLabels[key] ?? key}
                  score={score}
                  color={dimensionColors[key] ?? 'oklch(0.62 0.12 70)'}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-1" aria-label="Score level legend">
            {['Low', 'Moderate', 'Elevated', 'Strong'].map((l) => (
              <span key={l} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 inline-block" aria-hidden="true" />
                {l}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Cultural context tags */}
        {topTags.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
            <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Cultural context</h2>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Cultural context tags">
              {topTags.map(({ key, label, description: tagDesc }) => (
                <div
                  key={key}
                  role="listitem"
                  className="group relative"
                >
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-warm-border bg-secondary text-foreground cursor-default">
                    {label}
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 w-56 p-3 rounded-xl bg-foreground text-background text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                    {tagDesc}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2.5 pt-1">
              {topTags.map(({ key, label, description: tagDesc }) => (
                <div key={key} className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: 'oklch(0.62 0.12 70)' }}
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-xs font-medium text-foreground">{label}:</span>{' '}
                    <span className="text-xs text-muted-foreground">{tagDesc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recommended route */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="p-6 rounded-2xl border-2 space-y-4"
          style={{ borderColor: routeInfo.color, background: `${routeInfo.color}08` }}
        >
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Suggested pathway</p>
            <h2 className="text-xl font-medium text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {routeInfo.title}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{routeInfo.message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{ background: routeInfo.color, color: 'oklch(0.985 0.004 80)' }}
              onClick={() => {}}
              aria-label={routeInfo.primaryButton}
            >
              {routeInfo.primaryButton}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {route === 'mixed' && (
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => {}}
                aria-label="Explore therapy support"
              >
                Explore therapy support
              </button>
            )}
            {route === 'therapy' && (
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={onEmailCapture}
                aria-label="Save my reflection"
              >
                Save my reflection
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground italic">
            This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.
          </p>
        </motion.div>

        {/* Action row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={copied ? 'Summary copied' : 'Copy result summary'}
          >
            {copied ? <CheckCircle className="w-4 h-4 text-sage" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? 'Copied!' : 'Copy summary'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Download summary (demo)"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download summary
          </button>
          <button
            onClick={onEmailCapture}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Get a copy via email"
          >
            Get a copy via email
          </button>
        </motion.div>
      </div>
    </main>
  )
}
