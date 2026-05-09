'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera, AlertCircle, Loader2 } from 'lucide-react'
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

interface FaceScreenProps {
  onContinue: (
    confirmation: SelfConfirmation | null,
    supportivePoints: number,
    signalDescription: string | null,
  ) => void
  onSkip: () => void
  onBack: () => void
}

type Phase = 'permission' | 'idle' | 'scanning' | 'result'
type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

interface AnalysisOutcome {
  result: ClassifierResult
  quality: QualityReport
  supportivePoints: number
}

export default function FaceScreen({ onContinue, onSkip, onBack }: FaceScreenProps) {
  const [phase, setPhase] = useState<Phase>('permission')
  const [countdown, setCountdown] = useState<number>(FACE_ANALYSIS_CONFIG.windowSeconds)
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    status: landmarkerStatus,
    errorMessage: landmarkerError,
    liveSnapshot,
    ensureLoaded,
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
      .catch(() => {
        // Permissions API not supported — proceed normally.
      })
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
      setPhase('idle')
      // Pre-warm MediaPipe so the start button is snappy.
      ensureLoaded().catch(() => { /* surfaced via landmarkerError */ })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (error.name === 'NotAllowedError') {
        console.warn('[camera] Permission denied by user or browser settings.')
        setPermissionState('denied')
      } else if (error.name === 'NotFoundError') {
        console.warn('[camera] No camera device found.')
        setCameraError('No camera found on this device.')
        setPhase('idle')
      } else {
        console.warn('[camera] Unexpected error:', error.message)
        setCameraError('Unable to access camera: ' + error.message)
        setPhase('idle')
      }
    }
  }, [permissionState, ensureLoaded])

  /* ───────────────────────── wire stream to <video> ──────────────────────── */

  useEffect(() => {
    if (phase !== 'permission' && streamRef.current && videoRef.current) {
      const video = videoRef.current
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current
        video.play().catch(err => console.warn('[v0] Video play error:', err))
      }
      const handle = () => setCameraReady(true)
      video.onloadedmetadata = handle
      if (video.readyState >= 1) handle()
    }
  }, [phase, landmarkerError])

  /* ──────────────────────────────── cleanup ─────────────────────────────── */

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
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
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [stopCapture])

  /* ─────────────────────────── start the 10s scan ───────────────────────── */

  const startScan = useCallback(async () => {
    setOutcome(null)
    setConfirmation(null)
    setPhase('scanning')
    setCountdown(FACE_ANALYSIS_CONFIG.windowSeconds)

    try {
      await startCapture()
    } catch {
      // ensureLoaded surfaced an error; show it via landmarkerError below.
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

  /* ────────────────────────── continue / skip / back ────────────────────── */

  const handleConfirm = (c: SelfConfirmation) => setConfirmation(c)

  const handleContinue = () => {
    teardownCamera()
    const baselinePts = confirmation ? getSelfConfirmationPoints(confirmation) : 0
    const camPts = outcome?.supportivePoints ?? 0
    // If user says "no", drop the camera contribution entirely.
    const camWeighted = confirmation === 'no' ? 0 : camPts
    const totalPts = baselinePts + camWeighted
    const description = outcome?.quality.usable
      ? describeSignal(outcome.result.level)
      : null
    onContinue(confirmation, totalPts, description)
  }

  const handleSkip = () => {
    teardownCamera()
    onSkip()
  }

  const handleBack = () => {
    teardownCamera()
    onBack()
  }

  /* ────────────────────────────── derived UI ────────────────────────────── */

  const usable = outcome?.quality.usable ?? false
  const showConfirmation = outcome != null && usable && outcome.result.level !== 'low'

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
              Visual signal check
            </h1>
            <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty max-w-sm mx-auto">
              An optional 10-second on-device camera reflection. Your video never
              leaves this browser — only summary signals are kept, and only for
              this session.
            </p>
          </div>

          {/* Permission request */}
          <AnimatePresence>
            {phase === 'permission' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 w-full max-w-sm mx-auto"
              >
                {permissionState === 'denied' ? (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
                    <div className="flex justify-center">
                      <AlertCircle className="w-10 h-10 text-terracotta" aria-hidden="true" />
                    </div>
                    <div className="space-y-3 text-center">
                      <h2 className="text-lg font-medium text-foreground">Camera blocked</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your browser has blocked camera access for this site. To fix it:
                      </p>
                      <ol className="text-sm text-muted-foreground text-left space-y-1 list-decimal list-inside">
                        <li>Click the <strong className="text-foreground">lock icon</strong> in the address bar</li>
                        <li>Set <strong className="text-foreground">Camera</strong> to <strong className="text-foreground">Allow</strong></li>
                        <li>Reload the page, then come back here</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
                    <div className="flex justify-center">
                      <Camera className="w-10 h-10 text-gold" aria-hidden="true" />
                    </div>
                    <div className="space-y-2 text-center">
                      <h2 className="text-lg font-medium text-foreground">Allow camera access?</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        We use MediaPipe Face Landmarker on your device to extract
                        a few short facial-pattern summaries — no images are recorded
                        or sent anywhere.
                      </p>
                    </div>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hard camera device error — no video possible */}
          {phase !== 'permission' && cameraError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 w-full max-w-sm mx-auto"
            >
              <div className="p-6 rounded-2xl bg-card border border-warm-border space-y-4">
                <div className="flex justify-center">
                  <AlertCircle className="w-10 h-10 text-terracotta" aria-hidden="true" />
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-lg font-medium text-foreground">Camera unavailable</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cameraError}</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
              >
                Continue without camera
              </button>
            </motion.div>
          )}

          {/* Model load failed — show video but skip analysis */}
          {phase !== 'permission' && !cameraError && landmarkerError && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 w-full max-w-sm mx-auto"
            >
              {/* Still show the live video so the user isn't staring at a blank screen */}
              <div className="relative mx-auto w-56 h-56 rounded-3xl bg-card border-2 border-warm-border overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={224}
                  height={224}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  aria-label="Camera preview"
                />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-warm-border space-y-2 text-center">
                <p className="text-sm font-medium text-foreground">On-device analyzer unavailable</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The facial analysis model couldn&apos;t load in this browser environment.
                  You can still continue — your reflection will be based on your responses only.
                </p>
              </div>
              <button
                onClick={handleSkip}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
              >
                Continue with responses only
              </button>
            </motion.div>
          )}

          {/* Camera + live signal panel */}
          {phase !== 'permission' && !cameraError && !landmarkerError && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Video preview */}
              <div className="relative w-56 h-56 rounded-3xl bg-card border-2 border-warm-border overflow-hidden flex items-center justify-center shrink-0">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={224}
                  height={224}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  aria-label="Camera preview showing your face"
                />

                <AnimatePresence mode="wait">
                  {!cameraReady && phase === 'idle' && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-card"
                    >
                      <div className="relative">
                        <div className="w-24 h-28 rounded-full border-2 border-dashed border-warm-border" aria-hidden="true" />
                        <Camera className="w-6 h-6 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Starting camera...</p>
                    </motion.div>
                  )}

                  {phase === 'scanning' && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full border border-gold/60"
                          style={{ width: 80 + i * 32, height: 80 + i * 32 }}
                          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                          aria-hidden="true"
                        />
                      ))}
                      {/* Face-detection status dot */}
                      <motion.div
                        className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm"
                        aria-hidden="true"
                      >
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: liveSnapshot.faceDetected ? 'oklch(0.72 0.1 68)' : 'oklch(0.65 0.05 30)' }}
                          animate={liveSnapshot.faceDetected ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.5 }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-[10px] text-muted-foreground tracking-wide">
                          {liveSnapshot.faceDetected ? 'tracking' : 'no face'}
                        </span>
                      </motion.div>

                      <div className="relative z-10 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2">
                        <motion.span
                          className="text-3xl font-light text-gold"
                          style={{ fontFamily: 'var(--font-cormorant)' }}
                          key={countdown}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          aria-live="polite"
                          aria-label={`${countdown} seconds remaining`}
                        >
                          {countdown}
                        </motion.span>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'result' && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <motion.div
                          className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                          style={{ background: 'oklch(0.72 0.1 68 / 0.2)' }}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          aria-hidden="true"
                        >
                          <div className="w-5 h-5 rounded-full" style={{ background: 'oklch(0.72 0.1 68)' }} />
                        </motion.div>
                        <p className="text-xs text-foreground font-medium">Signal registered</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Live signal meters during scanning */}
              {phase === 'scanning' && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-3 w-full max-w-xs"
                  aria-hidden="true"
                >
                  <SignalMeter label="Brow tension" value={liveSnapshot.browTension} />
                  <SignalMeter label="Jaw / mouth pressure" value={liveSnapshot.jawTension} />
                  <SignalMeter label="Mouth tension" value={liveSnapshot.mouthTension} />
                  <SignalMeter label="Eye strain" value={liveSnapshot.eyeStrain} />
                  <SignalMeter label="Head motion" value={liveSnapshot.motion} />
                  {landmarkerStatus === 'loading' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading on-device analyzer…
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Result + confirmation */}
          <AnimatePresence>
            {phase === 'result' && outcome && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <ResultCard outcome={outcome} />

                {showConfirmation ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Does this feel accurate right now?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {confirmationOptions.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => handleConfirm(key)}
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
                ) : null}

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleContinue}
                  className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                  disabled={showConfirmation && !confirmation}
                >
                  Continue
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start button (idle) */}
          {phase === 'idle' && !cameraError && !landmarkerError && (
            <div className="space-y-3 max-w-sm mx-auto">
              <button
                onClick={startScan}
                disabled={!cameraReady}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                aria-label="Start 10 second visual check"
              >
                {cameraReady ? 'Start 10-second check' : 'Starting camera...'}
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Skip camera check"
              >
                Skip camera check
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="Cancel camera check"
            >
              Cancel
            </button>
          )}
        </motion.div>
      </section>
    </main>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                            Subcomponents                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function SignalMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(4, Math.min(100, value * 100))
  return (
    <div className="space-y-1 text-left">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground tracking-wide">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">
          {Math.round(pct)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-warm-border/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'oklch(0.62 0.12 70)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function ResultCard({ outcome }: { outcome: AnalysisOutcome }) {
  const { result, quality } = outcome
  const usable = quality.usable

  if (!usable) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2 text-left">
        <p className="text-sm font-medium text-foreground">Low-confidence read</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We couldn&apos;t get a reliable on-device signal, so your reflection
          will be based on your responses only.
        </p>
        {quality.warnings.length > 0 && (
          <ul className="text-xs text-muted-foreground/80 list-disc list-inside">
            {quality.warnings.map(w => (
              <li key={w}>{w}</li>
            ))}
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
    <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Activation reading
          </p>
          <p className="text-2xl font-light text-foreground" style={{ fontFamily: 'var(--font-cormorant)' }}>
            {levelLabel}
          </p>
        </div>
        <div
          className="text-right tabular-nums"
          style={{ color: levelColor }}
        >
          <div className="text-3xl font-light">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-warm-border/40 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: levelColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>

      <p className="text-sm text-muted-foreground italic leading-relaxed">
        &ldquo;Your camera reflection suggests {describeSignal(result.level)}.&rdquo;
      </p>

      {result.reasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            What we noticed
          </p>
          <ul className="text-xs text-muted-foreground/90 space-y-0.5">
            {result.reasons.slice(0, 4).map(r => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        Confidence {confidencePct}%. This is a supportive reflection, not a diagnosis.
      </p>
    </div>
  )
}
