'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  StopCircle,
  BookOpen,
  HelpCircle,
  ListChecks,
  Activity,
  Layers,
  Sparkle,
  Compass,
} from 'lucide-react'
import {
  GUIDE_STEP_SCRIPTS,
  defaultStepForScreen,
  defaultTargetForStep,
  formatChoicesForReading,
  type GuideStep,
} from '@/lib/quiet-guide/scripts'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useGuideTarget, type GuideSide } from '@/hooks/useGuideTarget'
import { useAccessibility } from '@/hooks/useAccessibility'

const ENABLED_KEY = 'qs.guide.enabled.v1'
const MUTED_KEY = 'qs.guide.muted.v1'

interface QuietGuideProps {
  /** Current screen identifier from QuietSignalsApp. */
  screen: string
  scenario?: { title: string; scenarioText: string } | null
  question?: { question: string; choices: { key: string; text: string }[] } | null
}

interface ResultCardOption {
  step: GuideStep
  label: string
  Icon: React.ElementType
}

const RESULT_CARDS: ResultCardOption[] = [
  { step: 'result-pattern', label: 'Pattern', Icon: Activity },
  { step: 'result-signal-map', label: 'Signal map', Icon: Layers },
  { step: 'result-supportive-signals', label: 'Signals', Icon: Sparkle },
  { step: 'result-next-step', label: 'Next step', Icon: Compass },
]

export default function QuietGuide({ screen, scenario, question }: QuietGuideProps) {
  const { effectiveCalm } = useAccessibility()

  const [enabled, setEnabled] = useState(true)
  const [muted, setMuted] = useState(false)
  const [open, setOpen] = useState(false) // is the action menu expanded?
  const [activeStep, setActiveStep] = useState<GuideStep>(defaultStepForScreen(screen))
  const [yielding, setYielding] = useState(false) // mouse hovering — slide aside

  const orbButtonRef = useRef<HTMLButtonElement | null>(null)
  const yieldTimerRef = useRef<number | null>(null)
  const userInteractedRef = useRef(false)
  /** Tracks the step we most recently spoke (auto OR manual) to avoid duplicate reads. */
  const lastSpokenStepRef = useRef<GuideStep | null>(null)

  // ── Persisted prefs ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const e = window.localStorage.getItem(ENABLED_KEY)
      const m = window.localStorage.getItem(MUTED_KEY)
      if (e !== null) setEnabled(e === 'true')
      if (m !== null) setMuted(m === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ENABLED_KEY, String(enabled))
    } catch {}
  }, [enabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(MUTED_KEY, String(muted))
    } catch {}
  }, [muted])

  // Track screen changes — reset step + close menu + reset yield
  useEffect(() => {
    setActiveStep(defaultStepForScreen(screen))
    setOpen(false)
    setYielding(false)
  }, [screen])

  // First user gesture unlocks browser speech autoplay policies.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = () => {
      userInteractedRef.current = true
    }
    window.addEventListener('pointerdown', flag, { once: true })
    window.addEventListener('keydown', flag, { once: true })
    return () => {
      window.removeEventListener('pointerdown', flag)
      window.removeEventListener('keydown', flag)
    }
  }, [])

  // ── Position ───────────────────────────────────────────────────────────────
  const targetId = defaultTargetForStep(activeStep)
  const { y, leftX, rightX, bottomSheet, autoSide } = useGuideTarget(enabled ? targetId : null)
  const effectiveSide: GuideSide = yielding
    ? autoSide === 'left'
      ? 'right'
      : 'left'
    : autoSide

  // ── Speech ─────────────────────────────────────────────────────────────────
  const { supported, isSpeaking, isPaused, speak, pause, resume, stop, replay } =
    useSpeechSynthesis()

  useEffect(() => {
    if (!enabled) stop()
  }, [enabled, stop])

  useEffect(() => {
    if (muted && isSpeaking) stop()
  }, [muted, isSpeaking, stop])

  const speakIfAllowed = useCallback(
    (text: string) => {
      if (!enabled || muted || !supported) return
      speak(text)
    },
    [enabled, muted, supported, speak],
  )

  // ── Auto-read whenever the active step changes ────────────────────────────
  // Browsers block speechSynthesis until a user interaction has occurred.
  // We attempt anyway; the API will silently no-op on the very first load,
  // and start working once the user has clicked anything in the page.
  useEffect(() => {
    if (!enabled || muted || !supported) return
    // If we already spoke this step (manually or auto) skip the re-trigger.
    if (lastSpokenStepRef.current === activeStep) return
    const text = GUIDE_STEP_SCRIPTS[activeStep]
    if (!text) return
    // Small delay so the screen settles and any prior utterance can cancel.
    const t = window.setTimeout(() => {
      speak(text)
      lastSpokenStepRef.current = activeStep
    }, 700)
    return () => {
      window.clearTimeout(t)
    }
    // We intentionally re-trigger only when the step or guide state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, enabled, muted, supported])

  // ── Hover yield: slide the orb to the opposite side temporarily ───────────
  const onOrbEnter = useCallback(() => {
    if (yieldTimerRef.current) {
      window.clearTimeout(yieldTimerRef.current)
      yieldTimerRef.current = null
    }
    setYielding(true)
  }, [])

  const onOrbLeave = useCallback(() => {
    if (yieldTimerRef.current) window.clearTimeout(yieldTimerRef.current)
    yieldTimerRef.current = window.setTimeout(() => {
      setYielding(false)
      yieldTimerRef.current = null
    }, 1400)
  }, [])

  useEffect(() => {
    return () => {
      if (yieldTimerRef.current) window.clearTimeout(yieldTimerRef.current)
    }
  }, [])

  // ── Close menu on outside click / Escape ───────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        orbButtonRef.current?.focus()
      }
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (target && target.closest('[data-quiet-guide-root]')) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // ── Scripts wired to actions ───────────────────────────────────────────────
  const readStep = () => speakIfAllowed(GUIDE_STEP_SCRIPTS[activeStep] ?? '')

  const readQuestion = () => {
    if (!question) return
    const lead = scenario?.scenarioText ? `${scenario.scenarioText}. ` : ''
    speakIfAllowed(`${lead}${question.question}`)
  }

  const readAnswers = () => {
    if (!question) return
    const text = formatChoicesForReading(question.choices)
    if (text) speakIfAllowed(text)
  }

  const readResultCard = (step: GuideStep) => {
    setActiveStep(step)
    // Pre-mark so the auto-read effect doesn't re-start the same utterance.
    lastSpokenStepRef.current = step
    speakIfAllowed(GUIDE_STEP_SCRIPTS[step])
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Avatar disabled → tiny "open" affordance in the corner
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(true)}
        aria-label="Turn Quiet Guide accessibility assistant on"
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-card border-2 border-warm-border shadow-md hover:border-gold/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center"
      >
        <span className="relative flex w-6 h-6 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-gold/20" />
          <span className="absolute inset-1.5 rounded-full bg-gold/35" />
        </span>
      </button>
    )
  }

  const transition = effectiveCalm
    ? { duration: 0.2, ease: 'easeOut' as const }
    : { type: 'spring' as const, stiffness: 110, damping: 18, mass: 0.6 }

  // Compute orb position (mobile = pinned bottom-right; desktop = side-anchored)
  const orbX = bottomSheet
    ? Math.max(12, (typeof window !== 'undefined' ? window.innerWidth : 320) - 68)
    : effectiveSide === 'left'
      ? leftX
      : rightX
  const orbY = bottomSheet
    ? Math.max(12, (typeof window !== 'undefined' ? window.innerHeight : 600) - 68)
    : y

  // Decide which side the menu opens on. The orb sits on a screen edge, so
  // open the menu inward toward the viewport center.
  const menuOnLeft = effectiveSide === 'right' // orb on right → menu opens left
  const flipUp = typeof window !== 'undefined' && orbY > window.innerHeight - 220

  return (
    <motion.div
      data-quiet-guide-root
      initial={false}
      animate={{ x: orbX, y: orbY }}
      transition={transition}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}
    >
      {/* Avatar orb — the only persistent visual */}
      <div
        className="relative"
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={onOrbEnter}
        onMouseLeave={onOrbLeave}
        onFocus={onOrbEnter}
        onBlur={onOrbLeave}
      >
        <button
          ref={orbButtonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close Quiet Guide menu' : 'Open Quiet Guide accessibility assistant'}
          aria-expanded={open}
          aria-haspopup="menu"
          className="w-14 h-14 rounded-full bg-card/95 backdrop-blur-sm border-2 border-warm-border shadow-md hover:border-gold/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center transition-colors"
        >
          <GuideOrb isSpeaking={isSpeaking && !muted} />
        </button>

        {/* Speaking indicator dot */}
        {(isSpeaking || isPaused) && (
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card"
            style={{ background: isPaused ? 'oklch(0.65 0.05 60)' : 'oklch(0.62 0.14 30)' }}
            aria-hidden="true"
          />
        )}

        {/* Action menu — only visible when user opens it */}
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              aria-label="Quiet Guide actions"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute rounded-2xl bg-card border-2 border-warm-border shadow-xl p-2 w-[260px]"
              style={{
                left: menuOnLeft ? undefined : 64,
                right: menuOnLeft ? 64 : undefined,
                top: flipUp ? undefined : 0,
                bottom: flipUp ? 0 : undefined,
              }}
            >
              <ActionMenu
                screen={screen}
                hasQuestion={!!question}
                supported={supported}
                muted={muted}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                onReadStep={readStep}
                onReadQuestion={readQuestion}
                onReadAnswers={readAnswers}
                onReadResultCard={readResultCard}
                onPause={pause}
                onResume={resume}
                onStop={stop}
                onReplay={replay}
                onToggleMute={() => setMuted((m) => !m)}
                onTurnOff={() => {
                  setEnabled(false)
                  setOpen(false)
                }}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Polite live region for assistive tech only */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isSpeaking ? 'Quiet Guide is speaking.' : isPaused ? 'Quiet Guide is paused.' : ''}
      </p>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Action menu (only opens on user click)                                     */
/* ────────────────────────────────────────────────────────────────────────── */

interface ActionMenuProps {
  screen: string
  hasQuestion: boolean
  supported: boolean
  muted: boolean
  isSpeaking: boolean
  isPaused: boolean
  onReadStep: () => void
  onReadQuestion: () => void
  onReadAnswers: () => void
  onReadResultCard: (step: GuideStep) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onReplay: () => void
  onToggleMute: () => void
  onTurnOff: () => void
  onClose: () => void
}

function ActionMenu({
  screen,
  hasQuestion,
  supported,
  muted,
  isSpeaking,
  isPaused,
  onReadStep,
  onReadQuestion,
  onReadAnswers,
  onReadResultCard,
  onPause,
  onResume,
  onStop,
  onReplay,
  onToggleMute,
  onTurnOff,
  onClose,
}: ActionMenuProps) {
  const isScenarioScreen = screen === 'scenario'
  const isResultsScreen = screen === 'results'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase tracking-widest text-gold font-medium">Quiet Guide</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Quiet Guide menu"
          className="w-7 h-7 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {!supported && (
        <p className="px-2 py-1 text-[11px] text-muted-foreground">
          Speech is unavailable in this browser. The guide stays text-only.
        </p>
      )}

      <div className="grid grid-cols-1 gap-1">
        <ActionButton
          Icon={BookOpen}
          label="Read this step"
          onClick={onReadStep}
          disabled={!supported || muted}
        />
        {isScenarioScreen && hasQuestion && (
          <>
            <ActionButton
              Icon={HelpCircle}
              label="Read question"
              onClick={onReadQuestion}
              disabled={!supported || muted}
            />
            <ActionButton
              Icon={ListChecks}
              label="Read answer choices"
              onClick={onReadAnswers}
              disabled={!supported || muted}
            />
          </>
        )}
        {isResultsScreen &&
          RESULT_CARDS.map(({ step, label, Icon }) => (
            <ActionButton
              key={step}
              Icon={Icon}
              label={`Read ${label.toLowerCase()}`}
              onClick={() => onReadResultCard(step)}
              disabled={!supported || muted}
            />
          ))}
      </div>

      <div className="flex items-center justify-between gap-1 pt-1.5 mt-1 border-t border-warm-border/60">
        <div className="flex items-center gap-0.5">
          {isSpeaking && !isPaused ? (
            <IconButton onClick={onPause} aria-label="Pause speech">
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>
          ) : isPaused ? (
            <IconButton onClick={onResume} aria-label="Resume speech">
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>
          ) : null}
          <IconButton
            onClick={onReplay}
            aria-label="Replay last spoken text"
            disabled={!supported || muted}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </IconButton>
          {(isSpeaking || isPaused) && (
            <IconButton onClick={onStop} aria-label="Stop speech">
              <StopCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>
          )}
          <IconButton
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Quiet Guide' : 'Mute Quiet Guide'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
          </IconButton>
        </div>

        <button
          type="button"
          onClick={onTurnOff}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded px-1.5 py-1"
        >
          Turn off
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Avatar visual — soft glowing orb, no text                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function GuideOrb({ isSpeaking }: { isSpeaking: boolean }) {
  const wavePaths = useMemo(
    () => [0, 1, 2].map((i) => `M${4 + i * 6},20 Q${7 + i * 6},${15 - i * 2} ${10 + i * 6},20 Q${13 + i * 6},${25 + i * 2} ${16 + i * 6},20`),
    [],
  )
  return (
    <span
      aria-hidden="true"
      className="relative w-9 h-9 rounded-full flex items-center justify-center"
      style={{ background: 'oklch(0.62 0.12 70 / 0.18)', border: '1.5px solid oklch(0.62 0.12 70 / 0.45)' }}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: 'oklch(0.62 0.12 70 / 0.10)' }}
        animate={isSpeaking ? { scale: [1, 1.18, 1], opacity: [0.4, 0.8, 0.4] } : { scale: 1, opacity: 0 }}
        transition={{ duration: 1.6, repeat: isSpeaking ? Infinity : 0, ease: 'easeInOut' }}
      />
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        {wavePaths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke="oklch(0.55 0.13 70)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            animate={isSpeaking ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.65 }}
            transition={{ duration: 1.2 + i * 0.25, repeat: isSpeaking ? Infinity : 0, delay: i * 0.15 }}
          />
        ))}
      </svg>
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Reusable buttons                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function ActionButton({
  Icon,
  label,
  onClick,
  disabled,
}: {
  Icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-gold flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function IconButton({
  children,
  onClick,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
      {...rest}
    >
      {children}
    </button>
  )
}
