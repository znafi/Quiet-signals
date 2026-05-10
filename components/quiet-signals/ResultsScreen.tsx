'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Download, RotateCcw, Camera, Mic, FileText, ExternalLink } from 'lucide-react'
import quietSignalsLogo from '@/components/ui/image.png'
import type { Resource, ResultMapping, UserSession } from '@/lib/quiet-signals/types'
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

const dimensionColors: Record<string, string> = {
  exhaustion: 'oklch(0.65 0.1 50)',
  mentalDistancing: 'oklch(0.60 0.07 148)',
  cognitiveImpairment: 'oklch(0.62 0.12 70)',
  emotionalImpairment: 'oklch(0.62 0.1 46)',
}

const pdfBarColors: Record<string, string> = {
  exhaustion: '#b1764d',
  mentalDistancing: '#6f8d69',
  cognitiveImpairment: '#b48a35',
  emotionalImpairment: '#aa694a',
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
  resources,
  logoSrc,
}: {
  session: UserSession
  resultTitle: string
  summary: string
  recommendation: string
  resources: Resource[]
  logoSrc: string
}): string {
  const signal = session.burnoutSignal || 'Burnout'
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
      const color = pdfBarColors[key] ?? '#b48a35'

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
  const resourceItems = resources.length
    ? resources
        .map(
          (resource) => `
            <div class="resource">
              <h3>${escapeHtml(resource.title)}</h3>
              <p>${escapeHtml(resource.description)}</p>
              ${resource.url ? `<p class="resource-url">${escapeHtml(resource.url)}</p>` : ''}
            </div>
          `
        )
        .join('')
    : ''

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
        <h3>${escapeHtml(signal)} burnout signal</h3>
        <p>${escapeHtml(recommendation)}</p>
        <p class="footer">This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.</p>
      </section>

      ${resourceItems ? `<section class="card"><h2>Resources</h2>${resourceItems}</section>` : ''}

      <p class="footer">Quiet Signals - Urban Consciousness / natIgnite 2026 AccessTech</p>
    </main>
    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 250)
      })
    </script>
  </body>
</html>`
}

function PatternBar({ label, score, max = 16, color }: { label: string; score: number; max?: number; color: string }) {
  const normalized = normalizeScore(score, max)
  const level = getScoreLevel(score, max)
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

export default function ResultsScreen({ session, resources, resultMappings, saveError, onRestart }: ResultsScreenProps) {
  const [personalizedSummary, setPersonalizedSummary] = useState<string | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const { toast } = useToast()

  const resultMapping = findResultMapping(session.totalScore, resultMappings)
  const signalResources = resources.filter((resource) => !resource.signal || resource.signal === 'All' || resource.signal === session.burnoutSignal)
  const summaryText = personalizedSummary || resultMapping.description

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
        recommendation: resultMapping.recommendation,
        resources: signalResources,
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
                  color={dimensionColors[key] ?? 'oklch(0.62 0.12 70)'}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-1" aria-label="Signal level legend">
            {['Low', 'Moderate', 'High'].map((l) => (
              <span key={l} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 inline-block" aria-hidden="true" />
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
              {session.burnoutSignal || resultMapping.signal} burnout signal
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{resultMapping.recommendation}</p>
          <p className="text-xs text-muted-foreground italic">
            This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.
          </p>
        </motion.div>

        {signalResources.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
            <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Resources</h2>
            <div className="space-y-3">
              {signalResources.map((resource) => (
                <div key={resource.id ?? resource.title} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{resource.title}</h3>
                    {resource.url ? (
                      <a href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title}`}>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
