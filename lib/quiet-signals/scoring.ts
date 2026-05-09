import type {
  UserSession,
  AnswerChoice,
  DimensionScores,
  CulturalTags,
  FinalRoute,
} from './types'

// ─── Default Session ──────────────────────────────────────────────────────────

export function createDefaultSession(): UserSession {
  return {
    entryPathway: '',
    reflectionMode: null,
    consent: {
      camera: false,
      voice: false,
      nonDiagnosticAcknowledged: false,
      supportiveSignalsAcknowledged: false,
      consentGiven: false,
    },
    faceSignal: {
      used: false,
      simulatedSignal: null,
      selfConfirmation: null,
      supportivePoints: 0,
    },
    voiceSignal: {
      used: false,
      simulatedSignal: null,
      selfConfirmation: null,
      supportivePoints: 0,
    },
    answers: [],
    dimensionScores: {
      patternRigidity: 0,
      patternRecognition: 0,
      reEngagement: 0,
      expansionReadiness: 0,
      capacityNarrowing: 0,
    },
    scenarioCounts: {
      highCapacityNarrowingScenarios: 0,
      lowReEngagementScenarios: 0,
      shutdownIndicators: 0,
      selfWorthIndicators: 0,
    },
    culturalTags: {
      authorityPreservation: 0,
      harmonyPreservation: 0,
      belongingPressure: 0,
      visibilitySafety: 0,
      performanceAdaptation: 0,
      professionalismAdaptation: 0,
      roleConditioning: 0,
      conflictConditioning: 0,
    },
    finalRoute: '',
    resultMessage: '',
    isDemoMode: false,
  }
}

// ─── Apply Answer Score ───────────────────────────────────────────────────────

export function applyAnswerScore(
  session: UserSession,
  choice: AnswerChoice
): UserSession {
  const dim = { ...session.dimensionScores }
  const tags = { ...session.culturalTags }
  const counts = { ...session.scenarioCounts }

  // Apply dimension scores
  for (const [key, value] of Object.entries(choice.scores)) {
    const k = key as keyof DimensionScores
    dim[k] = (dim[k] || 0) + (value || 0)
  }

  // Apply cultural tags
  if (choice.tags) {
    for (const tag of choice.tags) {
      tags[tag] = (tags[tag] || 0) + 1
    }
  }

  // Apply flags
  if (choice.flags?.shutdownIndicator) counts.shutdownIndicators += 1
  if (choice.flags?.selfWorthIndicator) counts.selfWorthIndicators += 1
  if (choice.flags?.lowReEngagement) counts.lowReEngagementScenarios += 1
  if (choice.flags?.highCapacityNarrowingScenario) counts.highCapacityNarrowingScenarios += 1

  return {
    ...session,
    dimensionScores: dim,
    culturalTags: tags,
    scenarioCounts: counts,
  }
}

// ─── Self Confirmation Points ─────────────────────────────────────────────────

export function getSelfConfirmationPoints(confirmation: string): number {
  switch (confirmation) {
    case 'yes': return 2
    case 'somewhat': return 1
    case 'unsure': return 0.5
    case 'no':
    default: return 0
  }
}

// ─── Normalize Score ──────────────────────────────────────────────────────────

// Each scenario has 4 questions, each with max 2 points → 5 scenarios × 4 questions × 2 pts = 40 max per dimension
// Practical realistic max per dimension ~ 20 (you'd need to score every answer toward that one dimension)
export function normalizeScore(score: number, max = 16): number {
  return Math.min(100, Math.round((score / max) * 100))
}

export type ScoreLevel = 'Low' | 'Moderate' | 'Elevated' | 'Strong'

export function getScoreLevel(normalized: number): ScoreLevel {
  if (normalized < 25) return 'Low'
  if (normalized < 55) return 'Moderate'
  if (normalized < 78) return 'Elevated'
  return 'Strong'
}

// ─── Pattern Name ─────────────────────────────────────────────────────────────

export function getPatternName(session: UserSession): string {
  const d = session.dimensionScores
  const t = session.culturalTags

  const capacityHigh = d.capacityNarrowing >= 8
  const capacityModerate = d.capacityNarrowing >= 4

  if (capacityHigh && d.patternRecognition < 4 && d.expansionReadiness < 4) {
    return 'Pressure Narrowing Pattern'
  }
  if (t.roleConditioning >= 2) return 'Helpful Until Overextended'
  if (t.conflictConditioning >= 2) return 'Conflict Safety Pattern'
  if (t.visibilitySafety >= 2 || t.belongingPressure >= 3) return 'Visibility Pressure'
  if (t.harmonyPreservation >= 3) return 'Harmony Protection Loop'
  if (d.patternRigidity >= 8 && t.performanceAdaptation >= 2) return 'Proving Under Pressure'
  if (d.patternRigidity >= 8 && capacityModerate) return 'High Responsibility, Low Recovery'
  if (d.expansionReadiness >= 8 && d.patternRecognition >= 6) return 'Reflective Growth Readiness'

  return 'Leadership Pressure Pattern'
}

// ─── Pattern Description ──────────────────────────────────────────────────────

export function getPatternDescription(patternName: string): string {
  const descriptions: Record<string, string> = {
    'Pressure Narrowing Pattern':
      'Your responses suggest that pressure may narrow your range in certain leadership moments. You may stay composed externally while carrying more internally, or you may need more recovery time after difficult interactions.',
    'Helpful Until Overextended':
      'Your responses suggest that a strong sense of responsibility and helpfulness may be tied to how you experience your value at work. Under pressure, this can make it difficult to protect your own capacity.',
    'Conflict Safety Pattern':
      'Your responses suggest that open disagreement may carry more weight than it appears on the surface. The pressure to keep relationships smooth may affect how freely you engage in high-stakes conversations.',
    'Visibility Pressure':
      'Your responses suggest that being seen, scrutinized, or taking up space in leadership contexts may carry a particular kind of pressure — one that can affect your confidence and consistency in visible moments.',
    'Harmony Protection Loop':
      'Your responses suggest a strong orientation toward maintaining stability in relationships and environments. Under pressure, keeping tension low may take priority in ways that can limit your range or recovery.',
    'Proving Under Pressure':
      'Your responses suggest that pressure moments often activate a drive to demonstrate competence or control. This pattern is common in high-performing environments and can sustain results while quietly narrowing recovery.',
    'High Responsibility, Low Recovery':
      'Your responses suggest that you carry high responsibility in leadership moments, but the space for recovery and reconnection may be more limited than what you need. This gap often grows quietly under sustained pressure.',
    'Reflective Growth Readiness':
      'Your responses suggest a notable capacity for self-awareness and re-engagement under pressure. You appear to be in a position where development support could meaningfully expand what is already available to you.',
    'Leadership Pressure Pattern':
      'Your responses reflect a pattern of leadership pressure that shows up across multiple dimensions. The reflection below may help you understand where capacity is being used and where recovery could be strengthened.',
  }
  return descriptions[patternName] || descriptions['Leadership Pressure Pattern']
}

// ─── Top Cultural Tags ────────────────────────────────────────────────────────

export function getTopCulturalTags(session: UserSession, max = 4): Array<{ key: keyof CulturalTags; label: string; description: string }> {
  const tagMeta: Record<keyof CulturalTags, { label: string; description: string }> = {
    authorityPreservation: { label: 'Authority Preservation', description: 'Pressure around hierarchy or seniority.' },
    harmonyPreservation: { label: 'Harmony Preservation', description: 'Pressure to avoid tension or keep relationships stable.' },
    belongingPressure: { label: 'Belonging Pressure', description: 'Concern about being judged, misunderstood, or seen as difficult.' },
    visibilitySafety: { label: 'Visibility Safety', description: 'Hesitation around being seen, scrutinized, or taking up space.' },
    performanceAdaptation: { label: 'Performance Adaptation', description: 'Proving, overpreparing, or overexplaining to maintain credibility.' },
    professionalismAdaptation: { label: 'Professionalism Adaptation', description: 'Masking strain to appear composed.' },
    roleConditioning: { label: 'Role Conditioning', description: 'Feeling valued mainly through being helpful or available.' },
    conflictConditioning: { label: 'Conflict Conditioning', description: 'Discomfort with open disagreement.' },
  }

  return Object.entries(session.culturalTags)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, max)
    .map(([key]) => ({
      key: key as keyof CulturalTags,
      ...tagMeta[key as keyof CulturalTags],
    }))
}

// ─── Final Route ──────────────────────────────────────────────────────────────

export function calculateFinalRoute(session: UserSession): FinalRoute {
  const d = session.dimensionScores
  const c = session.scenarioCounts

  const therapyCondition =
    (c.highCapacityNarrowingScenarios >= 3 &&
      c.lowReEngagementScenarios >= 3) ||
    (c.shutdownIndicators >= 3 && c.selfWorthIndicators >= 3)

  if (therapyCondition) return 'therapy'

  const coachingReadiness =
    d.patternRecognition >= 4 &&
    d.reEngagement >= 2 &&
    d.expansionReadiness >= 4

  const capacityElevated = d.capacityNarrowing >= 6

  if (coachingReadiness && !capacityElevated) return 'coaching'
  if (coachingReadiness && capacityElevated) return 'mixed'
  if (capacityElevated) return 'mixed'

  return 'coaching'
}

// ─── Result Summary Text ──────────────────────────────────────────────────────

export function generateResultSummary(session: UserSession): string {
  const patternName = getPatternName(session)
  const route = session.finalRoute
  const d = session.dimensionScores
  const topTags = getTopCulturalTags(session, 3).map((t) => t.label).join(', ')

  const routeLabel =
    route === 'coaching'
      ? '1:1 Leadership Coaching'
      : route === 'therapy'
      ? 'Therapeutic Support'
      : 'Coaching with Added Support'

  return `Quiet Signals Reflection Summary

Pattern: ${patternName}

Dimension Scores:
- Pattern Rigidity: ${d.patternRigidity}
- Pattern Recognition: ${d.patternRecognition}
- Re-engagement Capacity: ${d.reEngagement}
- Expansion Readiness: ${d.expansionReadiness}
- Capacity Narrowing: ${d.capacityNarrowing}

Cultural Context: ${topTags || 'None identified'}

Suggested Next Step: ${routeLabel}

---
This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.
Quiet Signals — Urban Consciousness / natIgnite 2026 AccessTech`
}

// ─── Demo Profiles ────────────────────────────────────────────────────────────

export function runDemoProfile(
  profileType: 'coaching' | 'mixed' | 'strain'
): UserSession {
  const session = createDefaultSession()
  session.isDemoMode = true
  session.entryPathway = 'individual'
  session.reflectionMode = 'text-only'
  session.answers = [] // demo skips individual answers

  if (profileType === 'coaching') {
    session.dimensionScores = { patternRigidity: 6, patternRecognition: 10, reEngagement: 6, expansionReadiness: 12, capacityNarrowing: 4 }
    session.culturalTags = { authorityPreservation: 1, harmonyPreservation: 1, belongingPressure: 1, visibilitySafety: 1, performanceAdaptation: 1, professionalismAdaptation: 0, roleConditioning: 0, conflictConditioning: 0 }
    session.scenarioCounts = { highCapacityNarrowingScenarios: 0, lowReEngagementScenarios: 1, shutdownIndicators: 0, selfWorthIndicators: 0 }
  } else if (profileType === 'mixed') {
    session.dimensionScores = { patternRigidity: 12, patternRecognition: 5, reEngagement: 4, expansionReadiness: 6, capacityNarrowing: 10 }
    session.culturalTags = { authorityPreservation: 1, harmonyPreservation: 3, belongingPressure: 2, visibilitySafety: 1, performanceAdaptation: 3, professionalismAdaptation: 2, roleConditioning: 1, conflictConditioning: 1 }
    session.scenarioCounts = { highCapacityNarrowingScenarios: 2, lowReEngagementScenarios: 3, shutdownIndicators: 1, selfWorthIndicators: 2 }
  } else {
    session.dimensionScores = { patternRigidity: 14, patternRecognition: 2, reEngagement: 1, expansionReadiness: 1, capacityNarrowing: 16 }
    session.culturalTags = { authorityPreservation: 1, harmonyPreservation: 2, belongingPressure: 3, visibilitySafety: 2, performanceAdaptation: 2, professionalismAdaptation: 2, roleConditioning: 2, conflictConditioning: 1 }
    session.scenarioCounts = { highCapacityNarrowingScenarios: 4, lowReEngagementScenarios: 4, shutdownIndicators: 3, selfWorthIndicators: 3 }
  }

  session.finalRoute = calculateFinalRoute(session)
  return session
}

// ─── Copy Result Summary ──────────────────────────────────────────────────────

export async function copyResultSummary(session: UserSession): Promise<boolean> {
  try {
    const text = generateResultSummary(session)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
