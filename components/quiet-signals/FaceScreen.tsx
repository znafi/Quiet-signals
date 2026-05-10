'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera, AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { SelfConfirmation } from '@/lib/quiet-signals/types'
import { getSelfConfirmationPoints } from '@/lib/quiet-signals/scoring'
import {
  aggregateFeatures,
  classifyFace,
  describeSignal,
  evaluateQuality,
  getFaceSupportivePoints,
  type ClassifierResult,
  type QualityReport,
  FACE_ANALYSIS_CONFIG,
} from '@/lib/quiet-signals/face-analysis'
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker'
import { useAccessibility } from '@/hooks/useAccessibility'

interface FaceScreenProps {
  onContinue: (
    confirmation: SelfConfirmation | null,
    supportivePoints: number,
    signalDescription: string | null,
  ) => void
  onSkip: () => void
  onBack: () => void
}

// Phases:
//   permission → ask browser for camera access
//   prescan    → live video + setup checklist + signal meters, user gets ready
//   scanning   → clean 10-second countdown, no meters
//   result     → classifier output + optional confirmation
type Phase = 'permission' | 'prescan' | 'scanning' | 'result'
type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

const SETUP_CHECKLIST = [
  { id: 'glasses', label: 'Remove glasses if possible' },
  { id: 'hat', label: 'Remove hat or cap' },
  { id: 'lighting', label: 'Face a light source (not behind you)' },
  { id: 'center', label: 'Center your face in the frame' },
]

interface AnalysisOutcome {
  result: ClassifierResult
  quality: QualityReport
  supportivePoints: number
}

export default function FaceScreen({ onContinue, onSkip, onBack }: FaceScreenProps) {
  const { effectiveCalm } = useAccessibility()
  const [phase, setPhase] = useState<Phase>('permission')
  const [countdown, setCountdown] = useState<number>(FACE_ANALYSIS_CONFIG.windowSeconds)
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Callback ref: wires the stream the instant any <video> element mounts.
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (!el || !streamRef.current) return
    if (el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current
      el.play().catch(err => console.warn('[camera] play error:', err))
    }
    const handle = () => setCameraReady(true)
    el.onloadedmetadata = handle
    if (el.readyState >= 1) handle()
  }, [])

  const {
    status: landmarkerStatus,
    errorMessage: landmarkerError,
    liveSnapshot,
    ensureLoaded,
    startLivePreview,
    startCapture,
    stopCapture,
  } = useFaceLandmarker({ videoRef, analysisFps: FACE_ANALYSIS_CONFIG.analysisFps })

  /* ─────────────────────────── camera permission ────────────────────────── */

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((permResult) => {
        setPermissionState(permResult.state as PermissionState)
        permResult.onchange = () =>
          setPermissionState(permResult.state as PermissionState)
      })
      .catch(() => {})
  }, [])

  const requestCameraPermission = useCallback(async () => {
    if (permissionState === 'denied') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      setPermissionState('granted')
      setPhase('prescan')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (error.name === 'NotAllowedError') {
        console.warn('[camera] Permission denied.')
        setPermissionState('denied')
      } else if (error.name === 'NotFoundError') {
        console.warn('[camera] No camera device found.')
        setCameraError('No camera found on this device.')
        setPhase('prescan')
      } else {
        console.warn('[camera] Unexpected error:', error.message)
        setCameraError('Unable to access camera: ' + error.message)
        setPhase('prescan')
      }
    }
  }, [permissionState])

  /* ── Start live-preview loop when we enter prescan ─────────────────────── */

  useEffect(() => {
    if (phase !== 'prescan') return
    startLivePreview().catch(() => { /* surfaced via landmarkerError */ })
  }, [phase, startLivePreview])

  /* ──────────────────────────────── cleanup ─────────────────────────────── */

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const teardownCamera = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    stopCapture()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [stopCapture])

  /* ───────────────────────────── start 10-s scan ────────────────────────── */

  const startScan = useCallback(async () => {
    setOutcome(null)
    setConfirmation(null)
    setPhase('scanning')
    setCountdown(FACE_ANALYSIS_CONFIG.windowSeconds)

    try {
      await startCapture()
    } catch {
      // landmarkerError surfaced in UI
    }

    let elapsed = FACE_ANALYSIS_CONFIG.windowSeconds
    countdownTimerRef.current = setInterval(() => {
      elapsed -= 1
      setCountdown(elapsed)
      if (elapsed <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
        const frames = stopCapture()
        const features = aggregateFeatures(frames)
        const quality = evaluateQuality(features)
        const result = classifyFace(features, quality)
        const supportivePoints = getFaceSupportivePoints(result, quality)
        setOutcome({ result, quality, supportivePoints })
        setPhase('result')
      }
    }, 1000)
  }, [startCapture, stopCapture])

  /* ──────────────────────────── handlers ────────────────────────────────── */

  const handleContinue = () => {
    teardownCamera()
    const shouldScoreConfirmation = outcome?.quality.usable === true && outcome.result.level !== 'low'
    const baselinePts = shouldScoreConfirmation && confirmation ? getSelfConfirmationPoints(confirmation) : 0
    const camPts = outcome?.supportivePoints ?? 0
    const camWeighted = shouldScoreConfirmation && confirmation === 'no' ? 0 : camPts
    const description = outcome?.quality.usable ? describeSignal(outcome.result.level) : null
    onContinue(confirmation, baselinePts + camWeighted, description)
  }

  const handleSkip = () => { teardownCamera(); onSkip() }
  const handleBack = () => { teardownCamera(); onBack() }

  const toggleCheck = (id: string) =>
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /* ───────────────────────────── derived state ───────────────────────────── */

  const usable = outcome?.quality.usable ?? false
  // Show the confirmation question for all usable reads, including low readings.
  // Low readings capture feedback without adding pressure-pattern points.
  const showConfirmation = outcome != null && usable
  const faceReady = liveSnapshot.faceDetected && cameraReady
  const modelLoading = landmarkerStatus === 'loading'

  /* ───────────────────────────────── render ──────────────────────────────── */

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

      <section
        data-guide-target="camera-check"
        className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full"
      >
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
                  Visual signal check
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An optional 10-second on-device camera reflection.
                  Your video never leaves this browser.
                </p>
              </div>

              <div className="space-y-6">
                {permissionState === 'denied' ? (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
                    <AlertCircle className="w-10 h-10 text-terracotta mx-auto" aria-hidden="true" />
                    <div className="space-y-3 text-center">
                      <h2 className="text-lg font-medium text-foreground">Camera blocked</h2>
                      <p className="text-sm text-muted-foreground">Your browser has blocked camera access:</p>
                      <ol className="text-sm text-muted-foreground text-left space-y-1 list-decimal list-inside">
                        <li>Click the <strong className="text-foreground">lock icon</strong> in the address bar</li>
                        <li>Set <strong className="text-foreground">Camera</strong> to <strong className="text-foreground">Allow</strong></li>
                        <li>Reload and come back here</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-3 text-center">
                    <Camera className="w-10 h-10 text-gold mx-auto" aria-hidden="true" />
                    <h2 className="text-lg font-medium text-foreground">Allow camera access?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We use on-device face landmark detection to extract brief
                      facial-pattern summaries. No images are stored or transmitted.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {permissionState !== 'denied' && (
                    <button
                      onClick={requestCameraPermission}
                      className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                    >
                      Allow camera
                    </button>
                  )}
                  <button
                    onClick={handleSkip}
                    className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    Skip camera check
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
                  Get ready
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Take a moment to set up. The actual scan takes only 10 seconds.
                </p>
              </div>

              {cameraError ? (
                <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-3 text-center max-w-sm mx-auto">
                  <AlertCircle className="w-8 h-8 text-terracotta mx-auto" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">Camera unavailable</p>
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                </div>
              ) : landmarkerError ? (
                /* Model failed — still show video, explain gracefully */
                <div className="space-y-4">
                  <VideoBox videoCallbackRef={videoCallbackRef} phase="prescan" faceDetected={false} />
                  <div className="p-4 rounded-2xl bg-card border border-warm-border space-y-1 text-center max-w-sm mx-auto">
                    <p className="text-sm font-medium text-foreground">On-device analyzer unavailable</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The analysis model couldn&apos;t load. Your reflection will be based on responses only.
                    </p>
                  </div>
                </div>
              ) : (
                /* Normal pre-scan layout: video left, checklist + meters right */
                <div className="flex flex-col lg:flex-row items-start gap-6 justify-center">
                  {/* Video + face-detection badge */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <VideoBox videoCallbackRef={videoCallbackRef} phase="prescan" faceDetected={liveSnapshot.faceDetected} />

                    {/* Face status */}
                    <motion.div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
                      animate={faceReady
                        ? { borderColor: 'oklch(0.72 0.1 68)', background: 'oklch(0.72 0.1 68 / 0.08)' }
                        : { borderColor: 'oklch(0.885 0.018 70)', background: 'oklch(0.988 0.006 75)' }
                      }
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: faceReady ? 'oklch(0.72 0.1 68)' : 'oklch(0.65 0.05 50)' }}
                        animate={faceReady ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span className="text-muted-foreground">
                        {!cameraReady ? 'Starting camera…'
                          : modelLoading ? 'Loading analyzer…'
                          : faceReady ? 'Face detected — ready'
                          : 'No face detected — adjust position'}
                      </span>
                      {modelLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
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
                      <SignalMeter label="Brow tension" value={liveSnapshot.browTension} />
                      <SignalMeter label="Jaw / mouth pressure" value={liveSnapshot.jawTension} />
                      <SignalMeter label="Mouth tension" value={liveSnapshot.mouthTension} />
                      <SignalMeter label="Eye strain" value={liveSnapshot.eyeStrain} />
                      <SignalMeter label="Head motion" value={liveSnapshot.motion} />
                      {!faceReady && (
                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                          Meters activate once your face is detected.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="space-y-2 max-w-sm mx-auto">
                {!cameraError && !landmarkerError && (
                  <button
                    onClick={startScan}
                    disabled={!faceReady}
                    className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                  >
                    {faceReady ? "I'm ready — start 10-second scan" : 'Waiting for face detection…'}
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {cameraError || landmarkerError ? 'Continue without camera' : 'Skip camera check'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SCANNING ── */}
          {phase === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-8 text-center"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Stay still</p>
                <h1 className="text-4xl md:text-5xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  Scanning…
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              </div>

              {/* Video with scanning rings */}
              <div className="relative w-64 h-64 rounded-3xl bg-card border-2 border-warm-border overflow-hidden flex items-center justify-center">
                <video
                  ref={videoCallbackRef}
                  autoPlay playsInline muted
                  width={256} height={256}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  aria-label="Camera feed"
                />

                {/* Pulsing rings — replaced with a static ring in calm mode */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {effectiveCalm ? (
                    <div
                      className="absolute rounded-full border border-gold/40"
                      style={{ width: 124, height: 124 }}
                      aria-hidden="true"
                    />
                  ) : (
                    [0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-gold/50"
                        style={{ width: 88 + i * 36, height: 88 + i * 36 }}
                        animate={{ scale: [1, 1.07, 1], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    ))
                  )}
                </div>

                {/* Face tracking dot */}
                <motion.div
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm"
                  aria-hidden="true"
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: liveSnapshot.faceDetected ? 'oklch(0.72 0.1 68)' : 'oklch(0.65 0.05 30)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {liveSnapshot.faceDetected ? 'tracking' : 'searching…'}
                  </span>
                </motion.div>

                {/* Countdown */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-5 py-1.5">
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
              </div>

              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Look naturally at the camera. Try not to change your expression intentionally.
              </p>

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
                  Check complete
                </h1>
                <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
              </div>

              <ResultCard outcome={outcome} />

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
/*  Shared video box (used in prescan phase)                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function VideoBox({
  videoCallbackRef,
  phase,
  faceDetected,
}: {
  videoCallbackRef: (el: HTMLVideoElement | null) => void
  phase: string
  faceDetected: boolean
}) {
  return (
    <div className="relative w-56 h-56 rounded-3xl bg-card border-2 border-warm-border overflow-hidden">
      <video
        ref={videoCallbackRef}
        autoPlay playsInline muted
        width={224} height={224}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        aria-label="Camera preview"
      />
      {/* Corner brackets */}
      {[
        'top-2 left-2 border-t-2 border-l-2 rounded-tl-lg',
        'top-2 right-2 border-t-2 border-r-2 rounded-tr-lg',
        'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg',
        'bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg',
      ].map((cls, i) => (
        <motion.div
          key={i}
          className={`absolute w-5 h-5 ${cls}`}
          style={{ borderColor: faceDetected ? 'oklch(0.72 0.1 68)' : 'oklch(0.885 0.018 70)' }}
          animate={{ opacity: faceDetected ? [0.6, 1, 0.6] : 0.5 }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          aria-hidden="true"
        />
      ))}
      {/* Phase label */}
      {phase === 'prescan' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
            preview
          </span>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Signal meter bar                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function SignalMeter({ label, value }: { label: string; value: number }) {
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

function ResultCard({ outcome }: { outcome: AnalysisOutcome }) {
  const { result, quality } = outcome

  if (!quality.usable) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2">
        <p className="text-sm font-medium text-foreground">Low-confidence read</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We couldn&apos;t get a reliable signal — your reflection will be based on your responses only.
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Activation reading</p>
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
        &ldquo;Your camera reflection suggests {describeSignal(result.level)}.&rdquo;
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
