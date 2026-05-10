'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Download, RotateCcw, Camera, Mic, FileText } from 'lucide-react'
import quietSignalsLogo from '@/components/ui/image.png'
import type { BurnoutSignal, Resource, ResultMapping, UserSession } from '@/lib/quiet-signals/types'
import {
  findResultMapping,
  normalizeScore,
  getScoreLevel,
  MAX_DIMENSION_SCORE,
} from '@/lib/quiet-signals/scoring'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface ResultsScreenProps {
  session: UserSession
  resources: Resource[]
  resultMappings: ResultMapping[]
  saveError?: string | null
  onRestart: () => void
}

const dimensionLabels: Record<string, string> = {
  exhaustion: 'Exhaustion',
  mentalDistancing: 'Mental Distancing',
  cognitiveImpairment: 'Cognitive Impairment',
  emotionalImpairment: 'Emotional Impairment',
}

interface SupportPlan {
  heading: string
  focus: string
  summary: string
}

function getSupportPlan(signal: BurnoutSignal): SupportPlan {
  if (signal === 'High') {
    return {
      heading: 'Therapy-focused support',
      focus: 'Therapy',
      summary:
        'A stronger burnout signal may benefit from therapy-led support: structured space with a licensed professional to work through sustained strain, recovery barriers, and patterns that feel hard to shift alone.',
    }
  }

  if (signal === 'Moderate') {
    return {
      heading: 'Counselling and therapy blend',
      focus: 'Counselling + therapy',
      summary:
        'A moderate burnout signal may call for a balanced mix: counselling for reflection, boundaries, and practical coping, with therapy added if the pressure feels persistent, emotionally heavy, or difficult to unwind.',
    }
  }

  return {
    heading: 'Counselling-focused support',
    focus: 'Counselling',
    summary:
      'A lower burnout signal may be well matched with counselling: a reflective, supportive space to protect what is working, strengthen recovery routines, and notice early signs before they build.',
  }
}

// Level-based color scale: Low=green, Moderate=amber, High=red
function levelColor(level: string): string {
  if (level === 'High') return 'oklch(0.56 0.10 28)'
  if (level === 'Moderate') return 'oklch(0.64 0.09 58)'
  return 'oklch(0.58 0.06 148)'
}

function levelColorPdf(level: string): string {
  if (level === 'High') return '#9c5a51'
  if (level === 'Moderate') return '#9a7946'
  return '#68866d'
}

const quietSignalsLogoSrc = typeof quietSignalsLogo === 'string' ? quietSignalsLogo : quietSignalsLogo.src

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildPdfHtml({
  session,
  resultTitle,
  summary,
  recommendation,
  supportHeading,
  logoSrc,
}: {
  session: UserSession
  resultTitle: string
  summary: string
  recommendation: string
  supportHeading: string
  logoSrc: string
}): string {
  const generatedAt = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const supportiveSignals = [
    session.faceSignal.used
      ? `Visual check: ${session.faceSignal.simulatedSignal ?? 'possible tension signal'}, self-confirmed as ${session.faceSignal.selfConfirmation ?? 'not confirmed'}.`
      : null,
    session.voiceSignal.used
      ? `Voice reflection: ${session.voiceSignal.simulatedSignal ?? 'possible pressure signal'}, self-confirmed as ${session.voiceSignal.selfConfirmation ?? 'not confirmed'}.`
      : null,
  ].filter((item): item is string => Boolean(item))
  const signalText = supportiveSignals.length
    ? supportiveSignals.map((item) => `<p>${escapeHtml(item)}</p>`).join('')
    : '<p>Camera and voice signals were skipped. Your result is based on scenario responses only.</p>'
  const bars = Object.entries(session.dimensionScores)
    .map(([key, score]) => {
      const width = normalizeScore(score, MAX_DIMENSION_SCORE)
      const label = dimensionLabels[key] ?? key
      const level = getScoreLevel(score, MAX_DIMENSION_SCORE)
      const color = levelColorPdf(level)

      return `
        <div class="bar-row">
          <div class="bar-meta">
            <span>${escapeHtml(label)}</span>
            <span>${level}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%; background: ${color};"></div>
          </div>
        </div>
      `
    })
    .join('')
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Quiet Signals Reflection</title>
    <style>
      @page { size: letter; margin: 0.55in; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f7f0df;
        color: #352f28;
        font-family: Inter, Arial, sans-serif;
        line-height: 1.5;
      }
      .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 28px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 18px;
        padding-bottom: 22px;
        border-bottom: 1px solid #dfd1b9;
      }
      .brand img {
        width: 86px;
        height: 86px;
        object-fit: contain;
      }
      .brand-title {
        margin: 0;
        font-family: Georgia, serif;
        font-size: 42px;
        font-weight: 400;
        line-height: 1;
      }
      .brand-subtitle {
        margin: 7px 0 0;
        color: #7c6e5a;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .hero {
        padding: 24px 0 8px;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: #a9792d;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-family: Georgia, serif;
        font-size: 34px;
        font-weight: 400;
        line-height: 1.12;
      }
      .date {
        margin: 8px 0 0;
        color: #7c6e5a;
        font-size: 12px;
      }
      .card {
        margin-top: 16px;
        padding: 18px;
        border: 1px solid #dfd1b9;
        border-radius: 16px;
        background: #fbf7ed;
        break-inside: avoid;
      }
      .support-card {
        border: 2px solid #b48a35;
        background: #f2e7d2;
      }
      h2 {
        margin: 0 0 9px;
        color: #7c6e5a;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      h3 {
        margin: 0 0 4px;
        color: #352f28;
        font-size: 14px;
      }
      p {
        margin: 0;
        font-size: 13px;
      }
      .card p + p {
        margin-top: 8px;
      }
      .bar-row + .bar-row {
        margin-top: 13px;
      }
      .bar-meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 5px;
        color: #7c6e5a;
        font-size: 11px;
        font-weight: 600;
      }
      .bar-track {
        height: 9px;
        overflow: hidden;
        border-radius: 999px;
        background: #eee3d1;
      }
      .bar-fill {
        height: 100%;
        border-radius: 999px;
      }
      .legend {
        display: flex;
        gap: 18px;
        margin-top: 11px;
        color: #7c6e5a;
        font-size: 11px;
      }
      .resource + .resource {
        margin-top: 11px;
        padding-top: 11px;
        border-top: 1px solid #eadfca;
      }
      .resource-url {
        margin-top: 3px;
        color: #8a672b;
        font-size: 10px;
        overflow-wrap: anywhere;
      }
      .footer {
        margin-top: 18px;
        color: #7c6e5a;
        font-size: 11px;
      }
      @media print {
        body { background: #f7f0df; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .page { padding: 0; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="brand">
        <img src="${escapeHtml(logoSrc)}" alt="Quiet Signals logo" />
        <div>
          <p class="brand-subtitle">Workplace reflection</p>
          <h1 class="brand-title">Quiet Signals</h1>
        </div>
      </header>

      <section class="hero">
        <p class="eyebrow">Your Quiet Signals Reflection</p>
        <h1>${escapeHtml(resultTitle)}</h1>
        <p class="date">Generated ${escapeHtml(generatedAt)}</p>
      </section>

      <section class="card">
        <h2>What may be happening</h2>
        <p>${escapeHtml(summary)}</p>
      </section>

      <section class="card">
        <h2>Supportive signals</h2>
        ${signalText}
      </section>

      <section class="card">
        <h2>Burnout signal map</h2>
        ${bars}
        <div class="legend"><span>Low</span><span>Moderate</span><span>High</span></div>
      </section>

      <section class="card support-card">
        <h2>Suggested support</h2>
        <h3>${escapeHtml(supportHeading)}</h3>
        <p>${escapeHtml(recommendation)}</p>
        <p class="footer">This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.</p>
      </section>

      <p class="footer">Quiet Signals — Leadership Reflection Tool</p>
    </main>
    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 250)
      })
    </script>
  </body>
</html>`
}

function PatternBar({ label, score, max = 16 }: { label: string; score: number; max?: number }) {
  const normalized = normalizeScore(score, max)
  const level = getScoreLevel(score, max)
  const color = levelColor(level)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-medium" style={{ color }}>{level}</span>
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

export default function ResultsScreen({ session, resultMappings, saveError, onRestart }: ResultsScreenProps) {
  const [personalizedSummary, setPersonalizedSummary] = useState<string | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const { toast } = useToast()

  const resultMapping = findResultMapping(session.totalScore, resultMappings)
  const summaryText = personalizedSummary || resultMapping.description
  const burnoutSignal = session.burnoutSignal || resultMapping.signal
  const supportPlan = getSupportPlan(burnoutSignal)

  useEffect(() => {
    let isMounted = true

    async function loadPersonalizedSummary() {
      setIsSummaryLoading(true)
      setPersonalizedSummary(null)

      try {
        const response = await fetch('/api/quiet-signals/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resultId: session.resultId,
            session,
          }),
        })

        if (!response.ok) {
          throw new Error('Summary request failed.')
        }

        const data = await response.json()
        const summary = typeof data.summary === 'string' ? data.summary.trim() : ''
        if (isMounted && summary) {
          setPersonalizedSummary(summary)
        }
      } catch (error) {
        console.warn('Unable to load personalized summary.', error)
      } finally {
        if (isMounted) setIsSummaryLoading(false)
      }
    }

    loadPersonalizedSummary()

    return () => {
      isMounted = false
    }
  }, [session])

  const handleDownload = () => {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      toast({ title: 'PDF blocked', description: 'Allow pop-ups for this site, then try downloading the PDF again.' })
      return
    }

    printWindow.document.open()
    printWindow.document.write(
      buildPdfHtml({
        session,
        resultTitle: resultMapping.title,
        summary: summaryText,
        recommendation: supportPlan.summary,
        supportHeading: supportPlan.heading,
        logoSrc: quietSignalsLogoSrc,
      })
    )
    printWindow.document.close()
    printWindow.focus()

    toast({ title: 'PDF ready', description: 'Choose Save as PDF in the print dialog.' })
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
            {resultMapping.title}
          </h1>
          <div className="w-12 h-px bg-gold mt-3" aria-hidden="true" />
        </motion.div>

        {saveError ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-3 rounded-2xl border border-destructive/35 bg-destructive/8 p-4"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">This reflection was not saved to Firebase.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{saveError}</p>
            </div>
          </motion.div>
        ) : null}

        {/* What may be happening */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-2">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">What may be happening</h2>
          <p className="text-sm text-foreground leading-relaxed text-pretty">{summaryText}</p>
          {isSummaryLoading ? (
            <p className="text-xs text-muted-foreground">Creating a personalized summary...</p>
          ) : null}
        </motion.div>

        {/* Supportive signals */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Supportive signals</h2>
          <div className="space-y-3">
            {session.faceSignal.used ? (
              <div className="flex items-start gap-3">
                <Camera className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Visual check: {session.faceSignal.simulatedSignal ?? 'possible tension signal'}, self-confirmed as{' '}
                  <span className="text-foreground font-medium">{session.faceSignal.selfConfirmation ?? 'not confirmed'}</span>.
                </p>
              </div>
            ) : null}
            {session.voiceSignal.used ? (
              <div className="flex items-start gap-3">
                <Mic className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Voice reflection: {session.voiceSignal.simulatedSignal ?? 'possible pressure signal'}, self-confirmed as{' '}
                  <span className="text-foreground font-medium">{session.voiceSignal.selfConfirmation ?? 'not confirmed'}</span>.
                </p>
              </div>
            ) : null}
            {!session.faceSignal.used && !session.voiceSignal.used && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Camera and voice signals were skipped. Your result is based on scenario responses only.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Burnout signal map */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-5">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Burnout signal map</h2>
          <div className="space-y-4" role="list" aria-label="Dimension signal patterns">
            {Object.entries(session.dimensionScores).map(([key, score]) => (
              <div key={key} role="listitem">
                <PatternBar
                  label={dimensionLabels[key] ?? key}
                  score={score}
                  max={MAX_DIMENSION_SCORE}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-1" aria-label="Signal level legend">
            {(['Low', 'Moderate', 'High'] as const).map((l) => (
              <span key={l} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: levelColor(l) }} aria-hidden="true" />
                {l}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Recommended support */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="p-6 rounded-2xl border-2 space-y-4"
          style={{ borderColor: 'oklch(0.62 0.12 70)', background: 'oklch(0.62 0.12 70 / 0.08)' }}
        >
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Suggested support</p>
            <h2 className="text-xl font-medium text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {supportPlan.heading}
            </h2>
          </div>
          <div className="rounded-xl border border-warm-border bg-card/70 p-4 space-y-2">
            <p className="text-[11px] font-medium tracking-widest uppercase text-gold">Primary fit</p>
            <p className="text-sm font-medium text-foreground">{supportPlan.focus}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{supportPlan.summary}</p>
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
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Download results as PDF"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download PDF
          </button>
        </motion.div>
      </div>
    </main>
  )
}
