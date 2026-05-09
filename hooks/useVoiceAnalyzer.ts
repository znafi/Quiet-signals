'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type VoiceFrameMeasurement,
  extractVoiceFrame,
  VOICE_ANALYSIS_CONFIG,
} from '@/lib/quiet-signals/voice-analysis'

export interface LiveVoiceSnapshot {
  isSpeaking: boolean
  energy: number          // 0..1 smoothed
  pitchProxy: number      // 0..1 smoothed spectral centroid
  flatness: number        // 0..1 smoothed
  zeroCrossing: number    // 0..1 smoothed
}

const EMPTY_SNAPSHOT: LiveVoiceSnapshot = {
  isSpeaking: false,
  energy: 0,
  pitchProxy: 0,
  flatness: 0,
  zeroCrossing: 0,
}

interface UseVoiceAnalyzerArgs {
  analysisFps?: number
}

export function useVoiceAnalyzer({
  analysisFps = VOICE_ANALYSIS_CONFIG.analysisFps,
}: UseVoiceAnalyzerArgs = {}) {
  const [liveSnapshot, setLiveSnapshot] = useState<LiveVoiceSnapshot>(EMPTY_SNAPSHOT)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastAnalysisRef = useRef<number>(0)
  const framesRef = useRef<VoiceFrameMeasurement[]>([])
  const isCapturingRef = useRef(false)
  const isRecordingRef = useRef(false)

  /**
   * Initialize audio context + analyser from a MediaStream.
   * Call after getUserMedia succeeds.
   */
  const initAudio = useCallback((stream: MediaStream) => {
    streamRef.current = stream

    const ctx = new AudioContext()
    audioContextRef.current = ctx

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048  // good frequency resolution for spectral features
    analyser.smoothingTimeConstant = 0.3
    analyserRef.current = analyser

    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
  }, [])

  /** Per-frame extraction loop. */
  const loop = useCallback(() => {
    if (!isCapturingRef.current) return

    const analyser = analyserRef.current
    if (!analyser) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    const now = performance.now()
    const minInterval = 1000 / analysisFps
    if (now - lastAnalysisRef.current < minInterval) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    lastAnalysisRef.current = now

    const frame = extractVoiceFrame(analyser, now)

    if (isRecordingRef.current) {
      framesRef.current.push(frame)
    }

    // Exponential smoothing for live meters
    const a = 0.35
    setLiveSnapshot(prev => ({
      isSpeaking: frame.isSpeaking,
      energy: prev.energy * (1 - a) + frame.rmsEnergy * a,
      pitchProxy: prev.pitchProxy * (1 - a) + frame.spectralCentroid * a,
      flatness: prev.flatness * (1 - a) + frame.spectralFlatness * a,
      zeroCrossing: prev.zeroCrossing * (1 - a) + frame.zeroCrossingRate * a,
    }))

    rafRef.current = requestAnimationFrame(loop)
  }, [analysisFps])

  /**
   * Start the live-preview loop — updates live meters but doesn't
   * collect frames for analysis. Use during the "check your mic" phase.
   */
  const startLivePreview = useCallback(() => {
    isRecordingRef.current = false
    framesRef.current = []
    lastAnalysisRef.current = 0
    isCapturingRef.current = true
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [loop])

  /**
   * Start recording frames for classification. Clears previous frames.
   */
  const startRecording = useCallback(() => {
    framesRef.current = []
    lastAnalysisRef.current = 0
    isRecordingRef.current = true
    isCapturingRef.current = true
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }, [loop])

  /**
   * Stop recording and return the collected frames for classification.
   */
  const stopRecording = useCallback((): VoiceFrameMeasurement[] => {
    isRecordingRef.current = false
    isCapturingRef.current = false
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    return framesRef.current.slice()
  }, [])

  /** Full teardown: stop capture, close audio context, stop tracks. */
  const cleanup = useCallback(() => {
    isRecordingRef.current = false
    isCapturingRef.current = false
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setLiveSnapshot(EMPTY_SNAPSHOT)
  }, [])

  useEffect(() => {
    return () => {
      isCapturingRef.current = false
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  return {
    liveSnapshot,
    initAudio,
    startLivePreview,
    startRecording,
    stopRecording,
    cleanup,
  }
}
