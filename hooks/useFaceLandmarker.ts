'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import {
  type FrameMeasurement,
  extractBlendshapes,
  extractHeadPose,
} from '@/lib/quiet-signals/face-analysis'

// All assets served from public/ — no CDN, no version mismatch.
const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/mediapipe/models/face_landmarker.task'

export type LandmarkerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'analyzing'
  | 'error'

export interface LiveSignalSnapshot {
  faceDetected: boolean
  browTension: number
  jawTension: number
  mouthTension: number
  eyeStrain: number
  motion: number
}

interface UseFaceLandmarkerArgs {
  videoRef: React.RefObject<HTMLVideoElement | null>
  analysisFps?: number
}

export function useFaceLandmarker({
  videoRef,
  analysisFps = 8,
}: UseFaceLandmarkerArgs) {
  const [status, setStatus] = useState<LandmarkerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSignalSnapshot>({
    faceDetected: false,
    browTension: 0,
    jawTension: 0,
    mouthTension: 0,
    eyeStrain: 0,
    motion: 0,
  })

  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastAnalysisRef = useRef<number>(0)
  const lastTimestampRef = useRef<number>(0)
  const framesRef = useRef<FrameMeasurement[]>([])
  const isCapturingRef = useRef(false)
  const isRecordingRef = useRef(false) // true only during the real 10-s scan
  const lastPoseRef = useRef<{ yaw: number; pitch: number; roll: number } | null>(null)

  /** Load model once (idempotent). Tries GPU first, falls back to CPU. */
  const ensureLoaded = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setStatus('loading')
    setErrorMessage(null)

    const commonOptions = {
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    }

    let filesetResolver
    try {
      filesetResolver = await FilesetResolver.forVisionTasks(WASM_PATH)
    } catch (err) {
      console.warn('[face-landmarker] WASM resolver failed:', err)
      setErrorMessage('Could not load on-device analyzer (WASM files missing).')
      setStatus('error')
      throw err
    }

    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        // TF Lite WASM prints "INFO:" to console.error which triggers
        // the Next.js dev overlay. Temporarily mute it during init.
        const origError = console.error
        console.error = (...args: unknown[]) => {
          const msg = String(args[0] ?? '')
          if (msg.startsWith('INFO:')) return
          origError.apply(console, args)
        }
        const lm = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          ...commonOptions,
        })
        console.error = origError
        console.info(`[face-landmarker] loaded with ${delegate} delegate`)
        landmarkerRef.current = lm
        setStatus('ready')
        return lm
      } catch (err) {
        console.error = console.error // restore in case of throw
        console.warn(`[face-landmarker] ${delegate} delegate failed:`, err)
      }
    }

    const msg = 'On-device analyzer could not start on this browser.'
    setErrorMessage(msg)
    setStatus('error')
    throw new Error(msg)
  }, [])

  /** Per-frame loop — runs while capturing. */
  const loop = useCallback(() => {
    if (!isCapturingRef.current) return
    const video = videoRef.current
    const lm = landmarkerRef.current
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    const nowRaw = performance.now()
    const minIntervalMs = 1000 / analysisFps
    if (nowRaw - lastAnalysisRef.current < minIntervalMs) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    lastAnalysisRef.current = nowRaw

    // MediaPipe requires strictly increasing integer timestamps.
    const timestamp = Math.max(Math.round(nowRaw), lastTimestampRef.current + 1)
    lastTimestampRef.current = timestamp

    let result: FaceLandmarkerResult | null = null
    try {
      result = lm.detectForVideo(video, timestamp)
    } catch {
      // Transient frame errors (e.g. video not yet decoded) — skip silently.
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    const hasFace =
      !!result &&
      Array.isArray(result.faceLandmarks) &&
      result.faceLandmarks.length > 0

    let blendshapes = null
    let pose = { yaw: 0, pitch: 0, roll: 0 }

    if (hasFace) {
      blendshapes = extractBlendshapes(
        result?.faceBlendshapes?.[0]?.categories,
      )
      const matrix = result?.facialTransformationMatrixes?.[0]?.data
      pose = extractHeadPose(matrix)
    }

    const frame: FrameMeasurement = {
      timestamp: timestamp,
      faceDetected: hasFace && blendshapes !== null,
      blendshapes,
      headYaw: pose.yaw,
      headPitch: pose.pitch,
      headRoll: pose.roll,
    }
    // Only collect frames when we're in the real recording window.
    if (isRecordingRef.current) framesRef.current.push(frame)

    if (hasFace && blendshapes) {
      const motionDelta = lastPoseRef.current
        ? Math.abs(pose.yaw - lastPoseRef.current.yaw) +
          Math.abs(pose.pitch - lastPoseRef.current.pitch) +
          Math.abs(pose.roll - lastPoseRef.current.roll)
        : 0
      lastPoseRef.current = pose

      const browTension = (blendshapes.browDownLeft + blendshapes.browDownRight) / 2
      const jawTension = Math.max(
        blendshapes.jawForward,
        (blendshapes.mouthPressLeft + blendshapes.mouthPressRight) / 2,
        blendshapes.mouthClose * 0.6,
      )
      const mouthTension = Math.max(
        (blendshapes.mouthFrownLeft + blendshapes.mouthFrownRight) / 2,
        (blendshapes.mouthPressLeft + blendshapes.mouthPressRight) / 2,
      )
      const eyeStrain = (blendshapes.eyeSquintLeft + blendshapes.eyeSquintRight) / 2
      const motion = Math.min(1, motionDelta / 0.08)

      setLiveSnapshot(prev => ({
        faceDetected: true,
        browTension: prev.browTension * 0.6 + browTension * 0.4,
        jawTension: prev.jawTension * 0.6 + jawTension * 0.4,
        mouthTension: prev.mouthTension * 0.6 + mouthTension * 0.4,
        eyeStrain: prev.eyeStrain * 0.6 + eyeStrain * 0.4,
        motion: prev.motion * 0.5 + motion * 0.5,
      }))
    } else {
      setLiveSnapshot(prev => ({
        ...prev,
        faceDetected: false,
        motion: prev.motion * 0.7,
      }))
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [videoRef, analysisFps])

  /**
   * Start the live-preview loop (for pre-scan meters) without recording frames.
   * Safe to call before the real scan starts.
   */
  const startLivePreview = useCallback(async () => {
    isRecordingRef.current = false
    framesRef.current = []
    lastPoseRef.current = null
    lastAnalysisRef.current = 0
    lastTimestampRef.current = 0
    isCapturingRef.current = true
    setStatus('analyzing')
    await ensureLoaded()
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [ensureLoaded, loop])

  /**
   * Begin the real recording window — clears any preview frames and starts
   * collecting measurements for classification.
   */
  const startCapture = useCallback(async () => {
    framesRef.current = []
    lastPoseRef.current = null
    lastAnalysisRef.current = 0
    lastTimestampRef.current = 0
    isRecordingRef.current = true
    isCapturingRef.current = true
    setStatus('analyzing')
    await ensureLoaded()
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [ensureLoaded, loop])

  const stopCapture = useCallback((): FrameMeasurement[] => {
    isRecordingRef.current = false
    isCapturingRef.current = false
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setStatus(landmarkerRef.current ? 'ready' : 'idle')
    return framesRef.current.slice()
  }, [])

  useEffect(() => {
    return () => {
      isCapturingRef.current = false
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      try {
        landmarkerRef.current?.close()
      } catch {
        // Model may already be released.
      }
      landmarkerRef.current = null
    }
  }, [])

  return {
    status,
    errorMessage,
    liveSnapshot,
    ensureLoaded,
    startLivePreview,
    startCapture,
    stopCapture,
  }
}
