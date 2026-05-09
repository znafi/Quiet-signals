/**
 * Quiet Signals — face-analysis core
 *
 * Privacy-first, on-device feature extraction and a transparent heuristic
 * classifier. Operates on MediaPipe FaceLandmarker outputs (blendshapes +
 * facial transformation matrix) sampled across a short capture window.
 *
 * Design rules (from product brief):
 *  - Output is SUPPORTIVE, not diagnostic.
 *  - All thresholds are interpretable and centralized below.
 *  - Confidence is gated by usable-frame ratio and stability — low quality
 *    captures must yield low confidence so the parent UI can ignore them.
 */

export type FaceSignalLevel = 'low' | 'moderate' | 'elevated'

export interface BlendshapeMap {
  // The subset of MediaPipe blendshape categories we use. All values 0..1.
  browDownLeft: number
  browDownRight: number
  browInnerUp: number
  browOuterUpLeft: number
  browOuterUpRight: number
  jawForward: number
  jawOpen: number
  mouthClose: number
  mouthFrownLeft: number
  mouthFrownRight: number
  mouthPressLeft: number
  mouthPressRight: number
  mouthPucker: number
  eyeBlinkLeft: number
  eyeBlinkRight: number
  eyeSquintLeft: number
  eyeSquintRight: number
  eyeWideLeft: number
  eyeWideRight: number
}

/** A single per-frame measurement extracted from MediaPipe output. */
export interface FrameMeasurement {
  timestamp: number
  faceDetected: boolean
  blendshapes: BlendshapeMap | null
  // Head pose proxies (radians-ish, derived from the 4x4 transform matrix).
  // We only use them for *variance*, never absolute orientation.
  headYaw: number
  headPitch: number
  headRoll: number
}

/** Aggregated features over the capture window. */
export interface AggregatedFeatures {
  framesTotal: number
  framesWithFace: number
  usableFrameRatio: number
  // Mean activation of supportive blendshape groups, each 0..1.
  browTension: number      // brows pulled down/together
  browWorry: number        // inner brow raise
  jawTension: number       // jaw clench / mouth press
  mouthTension: number     // frown / press / closed compression
  eyeStrain: number        // squint
  // Movement and temporal patterns.
  headMotion: number       // 0..1 — std-dev of head pose normalized
  blinkRate: number        // blinks per minute, estimated
  facialStillness: number  // 0..1 — 1 = very still (possible "freeze")
  // Quality signals
  poseDeviation: number    // 0..1 — how off-axis the user is on average
}

export interface QualityReport {
  signalQuality: number    // 0..1
  usable: boolean
  warnings: string[]
}

export interface ClassifierResult {
  level: FaceSignalLevel
  confidence: number       // 0..1
  activationScore: number  // 0..1 raw composite
  reasons: string[]        // human-readable, supportive language only
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                           Centralized thresholds                            */
/* ────────────────────────────────────────────────────────────────────────── */

export const FACE_ANALYSIS_CONFIG = {
  windowSeconds: 10,
  analysisFps: 8,
  // Quality gates
  minUsableFrameRatio: 0.6,
  maxPoseDeviation: 0.5,
  minFramesForResult: 20,
  minConfidenceForSupport: 0.55,
  // Classifier bands on the composite activation score (0..1)
  thresholds: {
    moderate: 0.32,
    elevated: 0.55,
  },
  // Blink detection: blendshape value above this counts as eye-closed
  blinkThreshold: 0.5,
  // Head motion normalization scale (radians of std dev → 0..1)
  headMotionScale: 0.18,
} as const

/* ────────────────────────────────────────────────────────────────────────── */
/*                        Blendshape extraction helper                         */
/* ────────────────────────────────────────────────────────────────────────── */

const BLENDSHAPE_KEYS: (keyof BlendshapeMap)[] = [
  'browDownLeft', 'browDownRight', 'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
  'jawForward', 'jawOpen', 'mouthClose',
  'mouthFrownLeft', 'mouthFrownRight',
  'mouthPressLeft', 'mouthPressRight', 'mouthPucker',
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
]

/** Convert a MediaPipe `Category[]` array into our flat BlendshapeMap. */
export function extractBlendshapes(
  categories: { categoryName: string; score: number }[] | undefined,
): BlendshapeMap | null {
  if (!categories || categories.length === 0) return null
  const map = {} as BlendshapeMap
  for (const key of BLENDSHAPE_KEYS) map[key] = 0
  for (const c of categories) {
    if ((BLENDSHAPE_KEYS as string[]).includes(c.categoryName)) {
      map[c.categoryName as keyof BlendshapeMap] = c.score
    }
  }
  return map
}

/** Pull approximate yaw/pitch/roll out of MediaPipe's 4x4 facial transform. */
export function extractHeadPose(matrix: Float32Array | number[] | undefined): {
  yaw: number; pitch: number; roll: number
} {
  if (!matrix || matrix.length < 16) return { yaw: 0, pitch: 0, roll: 0 }
  const m = matrix
  // Column-major 4x4. Standard rotation extraction.
  const r00 = m[0],  r01 = m[4],  r02 = m[8]
  const r10 = m[1],  r11 = m[5],  r12 = m[9]
  const r20 = m[2],  r21 = m[6],  r22 = m[10]
  // Suppress unused warnings while keeping the explicit decomposition readable.
  void r00; void r01; void r02; void r12

  const pitch = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22))
  const yaw = Math.atan2(r10, r00)
  const roll = Math.atan2(r21, r22)
  return { yaw, pitch, roll }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                    Aggregation across the capture window                    */
/* ────────────────────────────────────────────────────────────────────────── */

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  let s = 0
  for (const x of xs) s += (x - m) * (x - m)
  return Math.sqrt(s / (xs.length - 1))
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Aggregate per-frame measurements over the entire capture window. */
export function aggregateFeatures(frames: FrameMeasurement[]): AggregatedFeatures {
  const framesTotal = frames.length
  const withFace = frames.filter(f => f.faceDetected && f.blendshapes)
  const framesWithFace = withFace.length
  const usableFrameRatio = framesTotal > 0 ? framesWithFace / framesTotal : 0

  if (framesWithFace === 0) {
    return {
      framesTotal, framesWithFace, usableFrameRatio,
      browTension: 0, browWorry: 0, jawTension: 0, mouthTension: 0,
      eyeStrain: 0, headMotion: 0, blinkRate: 0, facialStillness: 1,
      poseDeviation: 1,
    }
  }

  const bs = withFace.map(f => f.blendshapes as BlendshapeMap)

  const browTension = mean(bs.map(b => (b.browDownLeft + b.browDownRight) / 2))
  const browWorry = mean(bs.map(b => b.browInnerUp))
  const jawTension = mean(bs.map(b => Math.max(b.jawForward, (b.mouthPressLeft + b.mouthPressRight) / 2, b.mouthClose * 0.6)))
  const mouthTension = mean(bs.map(b => Math.max((b.mouthFrownLeft + b.mouthFrownRight) / 2, (b.mouthPressLeft + b.mouthPressRight) / 2)))
  const eyeStrain = mean(bs.map(b => (b.eyeSquintLeft + b.eyeSquintRight) / 2))

  // Head motion: combined std-dev of yaw/pitch/roll across all frames with face.
  const yaws = withFace.map(f => f.headYaw)
  const pitches = withFace.map(f => f.headPitch)
  const rolls = withFace.map(f => f.headRoll)
  const motionRaw = (stdDev(yaws) + stdDev(pitches) + stdDev(rolls)) / 3
  const headMotion = clamp01(motionRaw / FACE_ANALYSIS_CONFIG.headMotionScale)

  // Blink detection: rising-edge transitions on combined eye-blink signal.
  let blinks = 0
  let inBlink = false
  for (const f of withFace) {
    const b = f.blendshapes as BlendshapeMap
    const eyeClosed = (b.eyeBlinkLeft + b.eyeBlinkRight) / 2
    if (!inBlink && eyeClosed > FACE_ANALYSIS_CONFIG.blinkThreshold) {
      blinks += 1
      inBlink = true
    } else if (inBlink && eyeClosed < FACE_ANALYSIS_CONFIG.blinkThreshold * 0.7) {
      inBlink = false
    }
  }
  // Convert to blinks per minute over the time the face was visible.
  const tStart = withFace[0].timestamp
  const tEnd = withFace[withFace.length - 1].timestamp
  const visibleSeconds = Math.max(1, (tEnd - tStart) / 1000)
  const blinkRate = (blinks / visibleSeconds) * 60

  // Stillness = 1 - normalized motion (used as a "freeze" indicator).
  const facialStillness = clamp01(1 - headMotion)

  // Pose deviation: how far the *mean* yaw/pitch sits from zero.
  const meanAbsYaw = Math.abs(mean(yaws))
  const meanAbsPitch = Math.abs(mean(pitches))
  const poseDeviation = clamp01((meanAbsYaw + meanAbsPitch) / 0.7)

  return {
    framesTotal, framesWithFace, usableFrameRatio,
    browTension: clamp01(browTension),
    browWorry: clamp01(browWorry),
    jawTension: clamp01(jawTension),
    mouthTension: clamp01(mouthTension),
    eyeStrain: clamp01(eyeStrain),
    headMotion,
    blinkRate,
    facialStillness,
    poseDeviation,
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                            Quality gating                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function evaluateQuality(features: AggregatedFeatures): QualityReport {
  const warnings: string[] = []
  const cfg = FACE_ANALYSIS_CONFIG

  if (features.framesTotal < cfg.minFramesForResult) {
    warnings.push('not enough frames captured')
  }
  if (features.usableFrameRatio < cfg.minUsableFrameRatio) {
    warnings.push('face was not consistently visible')
  }
  if (features.poseDeviation > cfg.maxPoseDeviation) {
    warnings.push('camera angle was off-axis for most of the capture')
  }

  // Quality score is a soft combination — never just a boolean.
  const frameScore = clamp01(features.usableFrameRatio / 0.95)
  const poseScore = clamp01(1 - features.poseDeviation / 0.8)
  const enoughFrames = features.framesTotal >= cfg.minFramesForResult ? 1 : 0.4
  const signalQuality = clamp01(frameScore * 0.55 + poseScore * 0.35 + enoughFrames * 0.10)

  const usable =
    warnings.length === 0 ||
    (features.usableFrameRatio >= cfg.minUsableFrameRatio &&
     features.poseDeviation <= cfg.maxPoseDeviation &&
     features.framesTotal >= cfg.minFramesForResult)

  return { signalQuality, usable, warnings }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                       Heuristic classifier (interpretable)                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Composite "activation" score in [0,1].
 *
 * Weights chosen so that no single dimension can dominate. The reasoning:
 *  - brow tension and jaw tension are the most consistently reported
 *    visible markers of pressure activation in the literature
 *  - mouth tension and brow worry act as supporting markers
 *  - eye strain matters but is also confounded by lighting / screen distance
 *  - movement extremes (very high motion OR unusual stillness) both suggest
 *    activation, modeled as a mild U-shape via |motion - 0.35|
 *  - blink rate departures from a typical 12–22 bpm baseline add a small
 *    contribution
 */
function computeActivationScore(f: AggregatedFeatures): number {
  const motionDeparture = Math.abs(f.headMotion - 0.35) // U-shape
  const blinkDeparture = (() => {
    if (f.blinkRate <= 0) return 0.2 // no blinks measured = mild concern
    const lo = 12, hi = 22
    if (f.blinkRate >= lo && f.blinkRate <= hi) return 0
    if (f.blinkRate < lo) return clamp01((lo - f.blinkRate) / 12)
    return clamp01((f.blinkRate - hi) / 30)
  })()

  const score =
    f.browTension     * 0.22 +
    f.jawTension      * 0.20 +
    f.mouthTension    * 0.15 +
    f.browWorry       * 0.12 +
    f.eyeStrain       * 0.10 +
    motionDeparture   * 0.11 +
    blinkDeparture    * 0.10

  return clamp01(score)
}

export function classifyFace(
  features: AggregatedFeatures,
  quality: QualityReport,
): ClassifierResult {
  const activationScore = computeActivationScore(features)
  const cfg = FACE_ANALYSIS_CONFIG

  let level: FaceSignalLevel
  if (activationScore >= cfg.thresholds.elevated) level = 'elevated'
  else if (activationScore >= cfg.thresholds.moderate) level = 'moderate'
  else level = 'low'

  // Confidence blends quality with how decisively the score sits inside its band.
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
  const decisiveness = clamp01(distanceFromBoundary / 0.18)
  const confidence = clamp01(quality.signalQuality * 0.7 + decisiveness * 0.3)

  // Build the supportive-language "reasons" list. We never claim diagnosis.
  const reasons: string[] = []
  const note = (cond: boolean, msg: string) => { if (cond) reasons.push(msg) }
  note(features.browTension > 0.18, 'brows pulled down or together')
  note(features.browWorry > 0.20, 'inner-brow raise (concern pattern)')
  note(features.jawTension > 0.18, 'jaw or mouth pressed')
  note(features.mouthTension > 0.20, 'mouth held tight')
  note(features.eyeStrain > 0.20, 'narrowed or squinting eyes')
  note(features.headMotion > 0.65, 'noticeable head movement / restlessness')
  note(features.headMotion < 0.08, 'unusually still posture')
  note(features.blinkRate > 28, 'higher-than-typical blink rate')
  note(features.blinkRate > 0 && features.blinkRate < 6, 'lower-than-typical blink rate')

  if (reasons.length === 0) {
    reasons.push('relaxed facial pattern overall')
  }

  return { level, confidence, activationScore, reasons }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                Phrasing helper for the supportive UI text                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function describeSignal(level: FaceSignalLevel): string {
  switch (level) {
    case 'elevated':
      return 'facial signs consistent with elevated tension or activation'
    case 'moderate':
      return 'mild facial signs of tension or activation'
    case 'low':
    default:
      return 'a relaxed facial pattern overall'
  }
}

/** Map a classifier result to supportive points fed into the questionnaire. */
export function getFaceSupportivePoints(
  result: ClassifierResult,
  quality: QualityReport,
): number {
  if (!quality.usable || result.confidence < FACE_ANALYSIS_CONFIG.minConfidenceForSupport) {
    return 0
  }
  // Bounded modifier: max 1.5 points so the camera never dominates routing.
  if (result.level === 'elevated') return 1.5
  if (result.level === 'moderate') return 0.75
  return 0
}
