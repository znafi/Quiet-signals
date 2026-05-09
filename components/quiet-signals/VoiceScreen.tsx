'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import type { SelfConfirmation } from '@/lib/quiet-signals/types'
import { getSelfConfirmationPoints } from '@/lib/quiet-signals/scoring'
import {
  aggregateVoiceFeatures,
  classifyVoice,
  describeVoiceSignal,
  evaluateVoiceQuality,
  getVoiceSupportivePoints,
  type VoiceClassifierResult,
  type VoiceQualityReport,
  VOICE_ANALYSIS_CONFIG,
} from '@/lib/quiet-signals/voice-analysis'
import { useVoiceAnalyzer } from '@/hooks/useVoiceAnalyzer'

interface VoiceScreenProps {
  onContinue: (
    confirmation: SelfConfirmation | null,
    supportivePoints: number,
    signalDescription: string | null,
  ) => void
  onSkip: () => void
  onBack: () => void
}

// Phases mirror FaceScreen:
//   permission → ask for mic access
//   prescan   → live meters + mic check, user adjusts environment
//   recording → clean view with countdown, actual analysis
//   result    → classifier output + optional confirmation
type Phase = 'permission' | 'prescan' | 'recording' | 'result'
type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

const SETUP_CHECKLIST = [
  { id: 'quiet', label: 'Find a quiet environment' },
  { id: 'distance', label: 'Keep device at arm\'s length' },
  { id: 'natural', label: 'Speak at your natural pace' },
]

interface VoiceOutcome {
  result: VoiceClassifierResult
  quality: VoiceQualityReport
  supportivePoints: number
}

export default function VoiceScreen({ onContinue, onSkip, onBack }: VoiceScreenProps) {
  const [phase, setPhase] = useState<Phase>('permission')
  const [countdown, setCountdown] = useState<number>(VOICE_ANALYSIS_CONFIG.recordingSeconds)
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [micReady, setMicReady] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [outcome, setOutcome] = useState<VoiceOutcome | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    liveSnapshot,
    initAudio,
    startLivePreview,
    startRecording: hookStartRecording,
    stopRecording: hookStopRecording,
    cleanup,
  } = useVoiceAnalyzer()

  /* ─────────────────────────── mic permission ───────────────────────────── */

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then(result => {
        setPermissionState(result.state as PermissionState)
        result.onchange = () => setPermissionState(result.state as PermissionState)
      })
      .catch(() => {})
  }, [])

  const requestMicPermission = useCallback(async () => {
    if (permissionState === 'denied') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
      initAudio(stream)
      setPermissionState('granted')
      setMicReady(true)
      setPhase('prescan')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (error.name === 'NotAllowedError') {
        console.warn('[mic] Permission denied.')
        setPermissionState('denied')
      } else if (error.name === 'NotFoundError') {
        console.warn('[mic] No microphone found.')
        setMicError('No microphone found on this device.')
        setPhase('prescan')
      } else {
        console.warn('[mic] Unexpected error:', error.message)
        setMicError('Unable to access microphone: ' + error.message)
        setPhase('prescan')
      }
    }
  }, [permissionState, initAudio])

  /* ──────────── Start live preview when entering prescan ────────────────── */

  useEffect(() => {
    if (phase !== 'prescan' || !micReady) return
    startLivePreview()
  }, [phase, micReady, startLivePreview])

  /* ──────────────────────────────── cleanup ─────────────────────────────── */

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      cleanup()
    }
  }, [cleanup])

  const teardown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    cleanup()
  }, [cleanup])

  /* ───────────────────────── start actual recording ─────────────────────── */

  const startActualRecording = useCallback(() => {
    setOutcome(null)
    setConfirmation(null)
    setPhase('recording')
    setCountdown(VOICE_ANALYSIS_CONFIG.recordingSeconds)

    hookStartRecording()

    let remaining = VOICE_ANALYSIS_CONFIG.recordingSeconds
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
        const frames = hookStopRecording()
        const features = aggregateVoiceFeatures(frames)
        const quality = evaluateVoiceQuality(features)
        const result = classifyVoice(features, quality)
        const supportivePoints = getVoiceSupportivePoints(result, quality)
        setOutcome({ result, quality, supportivePoints })
        setPhase('result')
      }
    }, 1000)
  }, [hookStartRecording, hookStopRecording])

  /** Allow finishing early after min recording time. */
  const finishEarly = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    const frames = hookStopRecording()
    const features = aggregateVoiceFeatures(frames)
    const quality = evaluateVoiceQuality(features)
    const result = classifyVoice(features, quality)
    const supportivePoints = getVoiceSupportivePoints(result, quality)
    setOutcome({ result, quality, supportivePoints })
    setPhase('result')
  }, [hookStopRecording])

  /* ─────────────────────────────── handlers ──────────────────────────────── */

  const handleContinue = () => {
    teardown()
    const baselinePts = confirmation ? getSelfConfirmationPoints(confirmation) : 0
    const camPts = outcome?.supportivePoints ?? 0
    const camWeighted = confirmation === 'no' ? 0 : camPts
    const description = outcome?.quality.usable ? describeVoiceSignal(outcome.result.level) : null
    onContinue(confirmation, baselinePts + camWeighted, description)
  }

  const handleSkip = () => { teardown(); onSkip() }
  const handleBack = () => { teardown(); onBack() }

  const toggleCheck = (id: string) =>
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /* ─────────────────────────── derived state ─────────────────────────────── */

  const usable = outcome?.quality.usable ?? false
  const showConfirmation = outcome != null && usable && outcome.result.level !== 'low'
  const elapsed = VOICE_ANALYSIS_CONFIG.recordingSeconds - countdown
  const canFinishEarly = elapsed >= VOICE_ANALYSIS_CONFIG.minRecordingSeconds

  /* ────────────────────────────── render ──────────────────────────────────── */

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      <div className="px-6 pt-6 md:px-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── PERMISSION ── */}
          {phase === 'permission' && (
            <motion.div
              key="permission"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-sm mx-auto space-y-8 text-center"
            >
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Voice reflection
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An optional 20-second on-device voice check.
                  No audio is recorded or transmitted — only summary patterns are kept for this session.
                </p>
              </div>

              <div className="space-y-6">
                {permissionState === 'denied' ? (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
                    <AlertCircle className="w-10 h-10 text-terracotta mx-auto" aria-hidden="true" />
                    <div className="space-y-3 text-center">
                      <h2 className="text-lg font-medium text-foreground">Microphone blocked</h2>
                      <p className="text-sm text-muted-foreground">Your browser has blocked microphone access:</p>
                      <ol className="text-sm text-muted-foreground text-left space-y-1 list-decimal list-inside">
                        <li>Click the <strong className="text-foreground">lock icon</strong> in the address bar</li>
                        <li>Set <strong className="text-foreground">Microphone</strong> to <strong className="text-foreground">Allow</strong></li>
                        <li>Reload and come back here</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-3 text-center">
                    <Mic className="w-10 h-10 text-gold mx-auto" aria-hidden="true" />
                    <h2 className="text-lg font-medium text-foreground">Allow microphone access?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We analyze broad vocal patterns (pace, energy, pauses) entirely on your device.
                      No audio is stored or transmitted.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {permissionState !== 'denied' && (
                    <button
                      onClick={requestMicPermission}
                      className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                    >
                      Allow microphone
                    </button>
                  )}
                  <button
                    onClick={handleSkip}
                    className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    Skip voice reflection
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PRE-SCAN ── */}
          {phase === 'prescan' && (
            <motion.div
              key="prescan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-4xl md:text-5xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Microphone check
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Speak normally to check your levels, then start the {VOICE_ANALYSIS_CONFIG.recordingSeconds}-second reflection.
                </p>
              </div>

              {micError ? (
                <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-3 text-center max-w-sm mx-auto">
                  <AlertCircle className="w-8 h-8 text-terracotta mx-auto" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">Microphone unavailable</p>
                  <p className="text-sm text-muted-foreground">{micError}</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-start gap-6 justify-center">
                  {/* Mic visualization + speech status */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <MicOrb energy={liveSnapshot.energy} isSpeaking={liveSnapshot.isSpeaking} />

                    <motion.div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
                      animate={liveSnapshot.isSpeaking
                        ? { borderColor: 'oklch(0.72 0.1 68)', background: 'oklch(0.72 0.1 68 / 0.08)' }
                        : { borderColor: 'oklch(0.885 0.018 70)', background: 'oklch(0.988 0.006 75)' }
                      }
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: liveSnapshot.isSpeaking ? 'oklch(0.72 0.1 68)' : 'oklch(0.65 0.05 50)' }}
                        animate={liveSnapshot.isSpeaking ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span className="text-muted-foreground">
                        {liveSnapshot.isSpeaking ? 'Speech detected — ready' : 'Try speaking to test your mic'}
                      </span>
                    </motion.div>
                  </div>

                  {/* Right column: checklist + live meters */}
                  <div className="flex flex-col gap-5 w-full max-w-xs">
                    {/* Setup checklist */}
                    <div className="p-4 rounded-2xl bg-card border border-warm-border space-y-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Before you start</p>
                      {SETUP_CHECKLIST.map(item => {
                        const done = checkedItems.has(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className="flex items-center gap-3 w-full text-left group focus:outline-none"
                            aria-pressed={done}
                          >
                            {done
                              ? <CheckCircle2 className="w-4 h-4 shrink-0 text-gold" aria-hidden="true" />
                              : <Circle className="w-4 h-4 shrink-0 text-warm-border group-hover:text-gold/60 transition-colors" aria-hidden="true" />
                            }
                            <span className={`text-sm transition-colors ${done ? 'text-foreground line-through decoration-muted-foreground/50' : 'text-muted-foreground group-hover:text-foreground'}`}>
                              {item.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Live signal meters */}
                    <div className="p-4 rounded-2xl bg-card border border-warm-border space-y-3" aria-hidden="true">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Live signals</p>
                      <VoiceMeter label="Volume / energy" value={liveSnapshot.energy} />
                      <VoiceMeter label="Pitch (spectral)" value={liveSnapshot.pitchProxy} />
                      <VoiceMeter label="Vocal clarity" value={1 - liveSnapshot.flatness} />
                      <VoiceMeter label="Speech activity" value={liveSnapshot.zeroCrossing} />
                      {!liveSnapshot.isSpeaking && (
                        <p className="text-[10px] text-muted-foreground/60">
                          Meters activate when speech is detected.
                        </p>
                      )}
                    </div>

                    {/* Prompt card */}
                    <div className="p-4 rounded-2xl bg-card border border-warm-border space-y-2">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">You&apos;ll be asked</p>
                      <p className="text-sm text-foreground font-light italic leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
                        &ldquo;Describe one workplace moment recently that stayed with you.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="space-y-2 max-w-sm mx-auto">
                {!micError && (
                  <button
                    onClick={startActualRecording}
                    disabled={!micReady}
                    className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                  >
                    {micReady ? `I'm ready — start ${VOICE_ANALYSIS_CONFIG.recordingSeconds}-second reflection` : 'Starting microphone…'}
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {micError ? 'Continue without microphone' : 'Skip voice reflection'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── RECORDING ── */}
          {phase === 'recording' && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-8 text-center"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Speak naturally</p>
                <h1 className="text-4xl md:text-5xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Listening…
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              </div>

              {/* Prompt */}
              <div className="p-5 rounded-2xl bg-card border border-warm-border max-w-sm">
                <p className="text-lg font-light text-foreground italic leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  &ldquo;Describe one workplace moment recently that stayed with you.&rdquo;
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Speak for {VOICE_ANALYSIS_CONFIG.recordingSeconds} seconds. We&apos;ll analyze pace, pauses, and energy patterns.
                </p>
              </div>

              {/* Mic orb with pulsing rings */}
              <MicOrb energy={liveSnapshot.energy} isSpeaking={liveSnapshot.isSpeaking} showRings />

              {/* Waveform */}
              <WaveForm energy={liveSnapshot.energy} />

              {/* Countdown + speech status */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: liveSnapshot.isSpeaking ? 'oklch(0.72 0.1 68)' : 'oklch(0.65 0.05 50)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {liveSnapshot.isSpeaking ? 'Listening…' : 'Waiting for speech…'}
                  </span>
                </div>
                <motion.span
                  key={countdown}
                  className="text-2xl font-light text-gold tabular-nums"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  aria-live="polite"
                  aria-label={`${countdown} seconds remaining`}
                >
                  {countdown}s
                </motion.span>
              </div>

              {/* Early finish */}
              {canFinishEarly && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={finishEarly}
                  className="px-6 py-2 rounded-full text-sm font-medium border-2 border-gold text-foreground hover:bg-gold/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  Done speaking
                </motion.button>
              )}

              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none underline underline-offset-2"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && outcome && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm mx-auto space-y-5"
            >
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Reflection complete
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              </div>

              <VoiceResultCard outcome={outcome} />

              {showConfirmation && (
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
              )}

              <button
                onClick={handleContinue}
                disabled={showConfirmation && !confirmation}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
              >
                Continue
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </section>
    </main>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Mic orb with energy-responsive animation                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function MicOrb({
  energy,
  isSpeaking,
  showRings = false,
}: {
  energy: number
  isSpeaking: boolean
  showRings?: boolean
}) {
  return (
    <div className="relative flex items-center justify-center">
      {showRings && [0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-gold/40"
          style={{ width: 88 + i * 28, height: 88 + i * 28 }}
          animate={{ scale: [1, 1 + energy * 0.08, 1], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          aria-hidden="true"
        />
      ))}
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
        style={{
          background: isSpeaking ? 'oklch(0.62 0.12 70 / 0.15)' : 'oklch(0.92 0.01 70)',
          border: `2px solid ${isSpeaking ? 'oklch(0.62 0.12 70 / 0.5)' : 'oklch(0.885 0.018 70)'}`,
        }}
        animate={{
          scale: isSpeaking ? [1, 1 + energy * 0.12, 1] : 1,
          boxShadow: isSpeaking
            ? [
                '0 0 0 0 oklch(0.62 0.12 70 / 0)',
                `0 0 0 ${6 + energy * 14}px oklch(0.62 0.12 70 / ${0.03 + energy * 0.07})`,
                '0 0 0 0 oklch(0.62 0.12 70 / 0)',
              ]
            : '0 0 0 0 oklch(0.62 0.12 70 / 0)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <Mic className="w-8 h-8" style={{ color: isSpeaking ? 'oklch(0.62 0.12 70)' : 'oklch(0.65 0.03 60)' }} />
      </motion.div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Waveform visualization                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function WaveForm({ energy }: { energy: number }) {
  return (
    <div className="flex items-center gap-1 h-10" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => {
        const variance = Math.sin(i * 0.7 + 0.3) * 0.5 + 0.5
        const height = 4 + energy * variance * 28
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{ background: 'oklch(0.62 0.12 70)' }}
            animate={{
              height: [height * 0.7, height, height * 0.7],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          />
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Voice signal meter bar                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function VoiceMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(3, Math.min(100, value * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground tracking-wide">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground/60">{Math.round(pct)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-warm-border/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'oklch(0.62 0.12 70)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Result card                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function VoiceResultCard({ outcome }: { outcome: VoiceOutcome }) {
  const { result, quality } = outcome

  if (!quality.usable) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2">
        <p className="text-sm font-medium text-foreground">Low-confidence read</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We couldn&apos;t get a reliable vocal signal — your reflection will be based on your responses only.
        </p>
        {quality.warnings.length > 0 && (
          <ul className="text-xs text-muted-foreground/70 list-disc list-inside space-y-0.5">
            {quality.warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>
    )
  }

  const levelColor =
    result.level === 'elevated' ? 'oklch(0.62 0.14 30)' :
    result.level === 'moderate' ? 'oklch(0.72 0.12 60)' :
    'oklch(0.72 0.10 140)'
  const levelLabel =
    result.level === 'elevated' ? 'Elevated' :
    result.level === 'moderate' ? 'Moderate' : 'Low'
  const score = Math.round(result.activationScore * 100)
  const confidencePct = Math.round(result.confidence * 100)

  return (
    <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Voice activation</p>
          <p className="text-2xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {levelLabel}
          </p>
        </div>
        <div className="text-right tabular-nums" style={{ color: levelColor }}>
          <div className="text-3xl font-light">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-warm-border/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: levelColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <p className="text-sm text-muted-foreground italic leading-relaxed">
        &ldquo;Your voice reflection suggests {describeVoiceSignal(result.level)}.&rdquo;
      </p>

      {result.reasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">What we noticed</p>
          <ul className="text-xs text-muted-foreground/90 space-y-0.5">
            {result.reasons.slice(0, 4).map(r => <li key={r}>· {r}</li>)}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        Confidence {confidencePct}% · Supportive reflection only, not a diagnosis.
      </p>
    </div>
  )
}
