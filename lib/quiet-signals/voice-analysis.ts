/**
 * Quiet Signals — voice-analysis core
 *
 * Privacy-first, on-device audio feature extraction using the Web Audio API
 * (AnalyserNode). No audio is recorded, stored, or transmitted — only
 * per-frame spectral/temporal snapshots are collected and aggregated into
 * a heuristic activation classifier identical in spirit to face-analysis.ts.
 *
 * Features extracted per frame (~10 FPS from requestAnimationFrame):
 *   - RMS energy (volume)
 *   - Spectral centroid (voice brightness / pitch proxy)
 *   - Spectral flatness (tonal vs noise-like)
 *   - Zero-crossing rate (speech/breathiness proxy)
 *   - Speaking / silence classification per frame
 *
 * Aggregated over the recording window:
 *   - Mean / variance of energy, centroid, flatness
 *   - Speaking ratio, pause count, mean pause duration
 *   - Energy trajectory (rising vs falling over time)
 *   - Spectral stability (centroid variance → pitch variability)
 *
 * Design rules (mirroring face-analysis):
 *   - Output is SUPPORTIVE, not diagnostic
 *   - All thresholds centralized in VOICE_ANALYSIS_CONFIG
 *   - Low-quality captures yield low confidence
 */

export type VoiceSignalLevel = 'low' | 'moderate' | 'elevated'

/** A single per-frame measurement extracted from the AnalyserNode. */
export interface VoiceFrameMeasurement {
  timestamp: number
  rmsEnergy: number         // 0..1 root-mean-square amplitude
  spectralCentroid: number  // normalized 0..1 (fraction of Nyquist)
  spectralFlatness: number  // 0..1 (1 = white noise, 0 = pure tone)
  zeroCrossingRate: number  // crossings per sample, normalized 0..1
  isSpeaking: boolean       // true if energy exceeds speech threshold
}

/** Aggregated features over the recording window. */
export interface VoiceAggregatedFeatures {
  framesTotal: number
  framesSpeaking: number
  speakingRatio: number          // 0..1
  // Energy
  meanEnergy: number             // 0..1
  energyVariance: number         // 0..1 (normalized)
  energyTrajectory: number       // -1..1 (negative = fading, positive = ramping)
  // Spectral
  meanCentroid: number           // 0..1
  centroidVariance: number       // 0..1 (normalized)
  meanFlatness: number           // 0..1
  // Temporal
  pauseCount: number
  meanPauseDuration: number      // seconds
  longestPause: number           // seconds
  meanZeroCrossing: number       // 0..1
  // Duration
  recordingDurationSeconds: number
}

export interface VoiceQualityReport {
  signalQuality: number  // 0..1
  usable: boolean
  warnings: string[]
}

export interface VoiceClassifierResult {
  level: VoiceSignalLevel
  confidence: number        // 0..1
  activationScore: number   // 0..1 raw composite
  reasons: string[]
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                           Centralized thresholds                            */
/* ────────────────────────────────────────────────────────────────────────── */

export const VOICE_ANALYSIS_CONFIG = {
  recordingSeconds: 20,
  minRecordingSeconds: 12,
  analysisFps: 10,
  // Speech detection (lowered to handle systems with lower mic gain)
  speechEnergyThreshold: 0.008,
  silenceGapSeconds: 0.35,
  // Quality gates
  minSpeakingRatio: 0.25,
  minFramesForResult: 60,
  minConfidenceForSupport: 0.50,
  // Classifier bands
  thresholds: {
    moderate: 0.30,
    elevated: 0.52,
  },
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/*               Per-frame feature extraction from AnalyserNode               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Extract a single frame's features from the AnalyserNode's current state.
 * Call this at ~10 FPS from a requestAnimationFrame loop.
 */
export function extractVoiceFrame(
  analyser: AnalyserNode,
  timestamp: number,
): VoiceFrameMeasurement {
  const fftSize = analyser.fftSize
  const sampleRate = analyser.context.sampleRate

  // Time-domain data for RMS and zero-crossing
  const timeData = new Float32Array(fftSize)
  analyser.getFloatTimeDomainData(timeData)

  // Frequency-domain data for spectral features
  const freqData = new Float32Array(analyser.frequencyBinCount)
  analyser.getFloatFrequencyData(freqData)

  const rmsEnergy = computeRMS(timeData)
  const zeroCrossingRate = computeZeroCrossingRate(timeData)
  const spectralCentroid = computeSpectralCentroid(freqData, sampleRate)
  const spectralFlatness = computeSpectralFlatness(freqData)
  const isSpeaking = rmsEnergy > VOICE_ANALYSIS_CONFIG.speechEnergyThreshold

  return {
    timestamp,
    rmsEnergy: clamp01(rmsEnergy),
    spectralCentroid: clamp01(spectralCentroid),
    spectralFlatness: clamp01(spectralFlatness),
    zeroCrossingRate: clamp01(zeroCrossingRate),
    isSpeaking,
  }
}

function computeRMS(timeData: Float32Array): number {
  let sum = 0
  for (let i = 0; i < timeData.length; i++) {
    sum += timeData[i] * timeData[i]
  }
  return Math.sqrt(sum / timeData.length)
}

function computeZeroCrossingRate(timeData: Float32Array): number {
  let crossings = 0
  for (let i = 1; i < timeData.length; i++) {
    if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) crossings++
  }
  return crossings / (timeData.length - 1)
}

/** Spectral centroid as fraction of Nyquist frequency. */
function computeSpectralCentroid(
  freqData: Float32Array,
  sampleRate: number,
): number {
  // Convert from dB to linear magnitude for proper weighting
  const magnitudes = new Float32Array(freqData.length)
  let totalMag = 0
  for (let i = 0; i < freqData.length; i++) {
    // freqData is in dB; clamp below -100 dB to avoid -Infinity
    const db = Math.max(freqData[i], -100)
    magnitudes[i] = Math.pow(10, db / 20)
    totalMag += magnitudes[i]
  }
  if (totalMag < 1e-10) return 0

  let weightedSum = 0
  const binHz = sampleRate / (freqData.length * 2)
  for (let i = 0; i < magnitudes.length; i++) {
    weightedSum += magnitudes[i] * (i * binHz)
  }
  const centroidHz = weightedSum / totalMag
  const nyquist = sampleRate / 2
  return centroidHz / nyquist
}

/** Spectral flatness (Wiener entropy): geometric / arithmetic mean of magnitudes. */
function computeSpectralFlatness(freqData: Float32Array): number {
  const n = freqData.length
  if (n === 0) return 0

  let logSum = 0
  let linSum = 0
  let validBins = 0

  for (let i = 1; i < n; i++) { // skip DC bin
    const db = Math.max(freqData[i], -100)
    const mag = Math.pow(10, db / 20)
    if (mag > 1e-10) {
      logSum += Math.log(mag)
      linSum += mag
      validBins++
    }
  }
  if (validBins === 0 || linSum < 1e-10) return 0

  const geometricMean = Math.exp(logSum / validBins)
  const arithmeticMean = linSum / validBins
  return Math.min(1, geometricMean / arithmeticMean)
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                    Aggregation across the recording window                  */
/* ────────────────────────────────────────────────────────────────────────── */

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

function variance(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  let s = 0
  for (const x of xs) s += (x - m) * (x - m)
  return s / (xs.length - 1)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/**
 * Compute energy trajectory as the slope of a simple linear regression
 * on the energy values over time. Normalized to roughly -1..1.
 */
function energySlope(energies: number[]): number {
  const n = energies.length
  if (n < 4) return 0
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += energies[i]
    sumXY += i * energies[i]
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-10) return 0
  const slope = (n * sumXY - sumX * sumY) / denom
  // Normalize: a slope of ±0.005/frame maps to ±1
  return clamp01(Math.abs(slope / 0.005)) * Math.sign(slope)
}

export function aggregateVoiceFeatures(
  frames: VoiceFrameMeasurement[],
): VoiceAggregatedFeatures {
  const framesTotal = frames.length
  const speaking = frames.filter(f => f.isSpeaking)
  const framesSpeaking = speaking.length
  const speakingRatio = framesTotal > 0 ? framesSpeaking / framesTotal : 0

  if (framesTotal === 0) {
    return {
      framesTotal: 0, framesSpeaking: 0, speakingRatio: 0,
      meanEnergy: 0, energyVariance: 0, energyTrajectory: 0,
      meanCentroid: 0, centroidVariance: 0, meanFlatness: 0,
      pauseCount: 0, meanPauseDuration: 0, longestPause: 0,
      meanZeroCrossing: 0, recordingDurationSeconds: 0,
    }
  }

  const energies = frames.map(f => f.rmsEnergy)
  const centroids = speaking.map(f => f.spectralCentroid)
  const flatnesses = speaking.map(f => f.spectralFlatness)
  const zeroCrossings = speaking.map(f => f.zeroCrossingRate)

  // Pause detection: sequences of non-speaking frames
  const pauses: number[] = [] // durations in seconds
  let currentPauseStart: number | null = null
  for (let i = 0; i < frames.length; i++) {
    if (!frames[i].isSpeaking) {
      if (currentPauseStart === null) currentPauseStart = frames[i].timestamp
    } else {
      if (currentPauseStart !== null) {
        const dur = (frames[i].timestamp - currentPauseStart) / 1000
        if (dur >= VOICE_ANALYSIS_CONFIG.silenceGapSeconds) {
          pauses.push(dur)
        }
        currentPauseStart = null
      }
    }
  }
  // Handle trailing pause
  if (currentPauseStart !== null && frames.length > 0) {
    const dur = (frames[frames.length - 1].timestamp - currentPauseStart) / 1000
    if (dur >= VOICE_ANALYSIS_CONFIG.silenceGapSeconds) {
      pauses.push(dur)
    }
  }

  const tStart = frames[0].timestamp
  const tEnd = frames[frames.length - 1].timestamp
  const recordingDurationSeconds = Math.max(1, (tEnd - tStart) / 1000)

  // Normalize variance to 0..1 using empirical scaling
  const rawEnergyVar = variance(energies)
  const rawCentroidVar = centroids.length > 1 ? variance(centroids) : 0

  return {
    framesTotal,
    framesSpeaking,
    speakingRatio,
    meanEnergy: clamp01(mean(energies)),
    energyVariance: clamp01(rawEnergyVar / 0.01), // scale: 0.01 var → 1.0
    energyTrajectory: energySlope(energies),
    meanCentroid: centroids.length > 0 ? clamp01(mean(centroids)) : 0,
    centroidVariance: clamp01(rawCentroidVar / 0.005),
    meanFlatness: flatnesses.length > 0 ? clamp01(mean(flatnesses)) : 0,
    pauseCount: pauses.length,
    meanPauseDuration: pauses.length > 0 ? mean(pauses) : 0,
    longestPause: pauses.length > 0 ? Math.max(...pauses) : 0,
    meanZeroCrossing: zeroCrossings.length > 0 ? clamp01(mean(zeroCrossings)) : 0,
    recordingDurationSeconds,
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                             Quality gating                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export function evaluateVoiceQuality(
  features: VoiceAggregatedFeatures,
): VoiceQualityReport {
  const warnings: string[] = []
  const cfg = VOICE_ANALYSIS_CONFIG

  if (features.framesTotal < cfg.minFramesForResult) {
    warnings.push('not enough audio data captured')
  }
  if (features.speakingRatio < cfg.minSpeakingRatio) {
    warnings.push('very little speech detected')
  }
  if (features.recordingDurationSeconds < cfg.minRecordingSeconds) {
    warnings.push('recording was too short')
  }

  const frameScore = clamp01(features.framesTotal / (cfg.minFramesForResult * 2))
  const speakingScore = clamp01(features.speakingRatio / 0.5)
  const durationScore = clamp01(features.recordingDurationSeconds / cfg.recordingSeconds)
  const signalQuality = clamp01(frameScore * 0.35 + speakingScore * 0.40 + durationScore * 0.25)

  const usable =
    features.framesTotal >= cfg.minFramesForResult &&
    features.speakingRatio >= cfg.minSpeakingRatio &&
    features.recordingDurationSeconds >= cfg.minRecordingSeconds

  return { signalQuality, usable, warnings }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                        Heuristic classifier                                 */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Composite voice "activation" score in [0,1].
 *
 * Reasoning:
 *   - Low energy + high flatness → monotone/fatigued speech (activation signal)
 *   - High energy variance → uneven/pressured delivery
 *   - High centroid variance → pitch instability (stress indicator)
 *   - Frequent/long pauses → hesitation or cognitive load
 *   - Very low speaking ratio → reluctance or difficulty articulating
 *   - Energy trajectory: strong ramp-up or fade-out both suggest activation
 *   - High mean centroid → voice pitched higher (stress)
 */
function computeVoiceActivationScore(f: VoiceAggregatedFeatures): number {
  // Low speaking ratio → activation signal (difficulty engaging)
  const speechReluctance = clamp01(1 - f.speakingRatio / 0.65)

  // Energy monotony: very low variance with speech present → flat affect
  const energyMonotony = f.speakingRatio > 0.2
    ? clamp01(1 - f.energyVariance / 0.4)
    : 0

  // High energy variance → uneven, pressured delivery
  const energyInstability = clamp01(f.energyVariance / 0.7)

  // Energy trajectory: strong absolute slope (ramping up OR fading)
  const trajectoryStress = clamp01(Math.abs(f.energyTrajectory))

  // High pitch proxy → voice stressed upward
  const pitchElevation = clamp01((f.meanCentroid - 0.15) / 0.25)

  // Pitch instability → stress
  const pitchInstability = clamp01(f.centroidVariance / 0.6)

  // Pause-based hesitation: normalized count per minute of speech
  const pauseRate = f.recordingDurationSeconds > 0
    ? f.pauseCount / (f.recordingDurationSeconds / 60)
    : 0
  const hesitation = clamp01(pauseRate / 12)

  // Long pauses → cognitive load
  const longPauseSignal = clamp01(f.longestPause / 4)

  const score =
    speechReluctance  * 0.12 +
    energyMonotony    * 0.14 +
    energyInstability * 0.10 +
    trajectoryStress  * 0.08 +
    pitchElevation    * 0.16 +
    pitchInstability  * 0.15 +
    hesitation        * 0.14 +
    longPauseSignal   * 0.11

  return clamp01(score)
}

export function classifyVoice(
  features: VoiceAggregatedFeatures,
  quality: VoiceQualityReport,
): VoiceClassifierResult {
  const activationScore = computeVoiceActivationScore(features)
  const cfg = VOICE_ANALYSIS_CONFIG

  let level: VoiceSignalLevel
  if (activationScore >= cfg.thresholds.elevated) level = 'elevated'
  else if (activationScore >= cfg.thresholds.moderate) level = 'moderate'
  else level = 'low'

  // Confidence: blend quality with decisiveness
  const distanceFromBoundary = (() => {
    if (level === 'elevated') return activationScore - cfg.thresholds.elevated
    if (level === 'moderate') {
      return Math.min(
        activationScore - cfg.thresholds.moderate,
        cfg.thresholds.elevated - activationScore,
      )
    }
    return cfg.thresholds.moderate - activationScore
  })()
  const decisiveness = clamp01(distanceFromBoundary / 0.15)
  const confidence = clamp01(quality.signalQuality * 0.65 + decisiveness * 0.35)

  // Supportive-language reasons
  const reasons: string[] = []
  const note = (cond: boolean, msg: string) => { if (cond) reasons.push(msg) }

  note(features.speakingRatio < 0.35, 'noticeable hesitation or reluctance to speak')
  note(features.energyVariance < 0.15 && features.speakingRatio > 0.3, 'flat or monotone vocal delivery')
  note(features.energyVariance > 0.55, 'uneven energy in speech pattern')
  note(Math.abs(features.energyTrajectory) > 0.5, 'vocal energy shifted noticeably during recording')
  note(features.meanCentroid > 0.28, 'voice pitched higher than typical baseline')
  note(features.centroidVariance > 0.4, 'pitch variability suggesting vocal tension')
  note(features.pauseCount > 4 && features.recordingDurationSeconds < 25, 'frequent pauses or hesitation')
  note(features.longestPause > 3, 'extended silence mid-speech')
  note(features.meanFlatness > 0.5, 'breathy or strained vocal quality')

  if (reasons.length === 0) {
    reasons.push('relaxed and steady vocal pattern overall')
  }

  return { level, confidence, activationScore, reasons }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                          Phrasing helpers                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function describeVoiceSignal(level: VoiceSignalLevel): string {
  switch (level) {
    case 'elevated':
      return 'vocal patterns consistent with elevated tension or cognitive load'
    case 'moderate':
      return 'mild vocal signs of tension or pressure'
    case 'low':
    default:
      return 'a relaxed and steady vocal pattern overall'
  }
}

/** Map a classifier result to supportive points (max 1.5, same as face). */
export function getVoiceSupportivePoints(
  result: VoiceClassifierResult,
  quality: VoiceQualityReport,
): number {
  if (!quality.usable || result.confidence < VOICE_ANALYSIS_CONFIG.minConfidenceForSupport) {
    return 0
  }
  if (result.level === 'elevated') return 1.5
  if (result.level === 'moderate') return 0.75
  return 0
}
