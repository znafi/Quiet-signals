import type {
  UserSession,
  AnswerChoice,
  DimensionScores,
  BurnoutSignal,
  ResultMapping,
} from './types'
import { DEFAULT_QUIZ_CONTENT } from './scenarios'

export const MAX_DIMENSION_SCORE = 6
export const MAX_TOTAL_SCORE = 24

export function createDefaultSession(): UserSession {
  return {
    entryPathway: '',
    contactInfo: null,
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
      exhaustion: 0,
      mentalDistancing: 0,
      cognitiveImpairment: 0,
      emotionalImpairment: 0,
    },
    totalScore: 0,
    burnoutSignal: '',
    resultMessage: '',
    isDemoMode: false,
  }
}

export function applyAnswerScore(
  session: UserSession,
  choice: AnswerChoice
): UserSession {
  const dimensionScores = { ...session.dimensionScores }

  for (const [key, value] of Object.entries(choice.scores)) {
    const dimensionKey = key as keyof DimensionScores
    dimensionScores[dimensionKey] = (dimensionScores[dimensionKey] || 0) + (value || 0)
  }

  return {
    ...session,
    dimensionScores,
    totalScore: calculateTotalScore(dimensionScores),
  }
}

export function calculateTotalScore(scores: DimensionScores): number {
  return Object.values(scores).reduce((total, score) => total + score, 0)
}

export function getBurnoutSignal(totalScore: number): BurnoutSignal {
  if (totalScore <= 8) return 'Low'
  if (totalScore <= 15) return 'Moderate'
  return 'High'
}

export function findResultMapping(
  totalScore: number,
  mappings: ResultMapping[] = DEFAULT_QUIZ_CONTENT.resultMappings
): ResultMapping {
  return (
    mappings.find((mapping) => totalScore >= mapping.minScore && totalScore <= mapping.maxScore) ??
    DEFAULT_QUIZ_CONTENT.resultMappings[0]
  )
}

export function finalizeSession(
  session: UserSession,
  mappings: ResultMapping[] = DEFAULT_QUIZ_CONTENT.resultMappings
): UserSession {
  const totalScore = calculateTotalScore(session.dimensionScores)
  const burnoutSignal = getBurnoutSignal(totalScore)
  const mapping = findResultMapping(totalScore, mappings)

  return {
    ...session,
    totalScore,
    burnoutSignal,
    resultMessage: `${mapping.title}: ${mapping.description}`,
  }
}

export function getSelfConfirmationPoints(confirmation: string): number {
  switch (confirmation) {
    case 'yes': return 2
    case 'somewhat': return 1
    case 'unsure': return 0.5
    case 'no':
    default: return 0
  }
}

export function normalizeScore(score: number, max = MAX_DIMENSION_SCORE): number {
  return Math.min(100, Math.round((score / max) * 100))
}

export type ScoreLevel = 'Low' | 'Moderate' | 'High'

export function getScoreLevel(score: number, max = MAX_DIMENSION_SCORE): ScoreLevel {
  const normalized = normalizeScore(score, max)
  if (normalized < 34) return 'Low'
  if (normalized < 67) return 'Moderate'
  return 'High'
}

export function generateResultSummary(session: UserSession): string {
  const d = session.dimensionScores
  const signal = session.burnoutSignal || getBurnoutSignal(session.totalScore)

  return `Quiet Signals Burnout Reflection

Burnout Signal: ${signal}
Total Score: ${session.totalScore} / ${MAX_TOTAL_SCORE}

Dimension Scores:
- Exhaustion: ${d.exhaustion} / ${MAX_DIMENSION_SCORE}
- Mental Distancing: ${d.mentalDistancing} / ${MAX_DIMENSION_SCORE}
- Cognitive Impairment: ${d.cognitiveImpairment} / ${MAX_DIMENSION_SCORE}
- Emotional Impairment: ${d.emotionalImpairment} / ${MAX_DIMENSION_SCORE}

This reflection is not a diagnosis. It is a pattern-based guide to help you consider what kind of support may be useful.
Quiet Signals — Urban Consciousness / natIgnite 2026 AccessTech`
}

export function runDemoProfile(
  profileType: 'coaching' | 'mixed' | 'strain'
): UserSession {
  const session = createDefaultSession()
  session.isDemoMode = true
  session.entryPathway = 'individual'
  session.reflectionMode = 'text-only'

  if (profileType === 'coaching') {
    session.dimensionScores = { exhaustion: 1, mentalDistancing: 1, cognitiveImpairment: 2, emotionalImpairment: 1 }
  } else if (profileType === 'mixed') {
    session.dimensionScores = { exhaustion: 3, mentalDistancing: 4, cognitiveImpairment: 3, emotionalImpairment: 3 }
  } else {
    session.dimensionScores = { exhaustion: 5, mentalDistancing: 5, cognitiveImpairment: 4, emotionalImpairment: 5 }
  }

  return finalizeSession(session)
}

export async function copyResultSummary(session: UserSession): Promise<boolean> {
  try {
    const text = generateResultSummary(session)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
