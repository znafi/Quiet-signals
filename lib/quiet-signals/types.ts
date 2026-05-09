// ─── Types ────────────────────────────────────────────────────────────────────

export type SelfConfirmation = 'yes' | 'somewhat' | 'no' | 'unsure'

export type ReflectionMode = 'camera-and-voice' | 'voice-only' | 'text-only'

export type FinalRoute = 'coaching' | 'therapy' | 'mixed' | ''

export interface DimensionScores {
  patternRigidity: number
  patternRecognition: number
  reEngagement: number
  expansionReadiness: number
  capacityNarrowing: number
}

export interface CulturalTags {
  authorityPreservation: number
  harmonyPreservation: number
  belongingPressure: number
  visibilitySafety: number
  performanceAdaptation: number
  professionalismAdaptation: number
  roleConditioning: number
  conflictConditioning: number
}

export interface ScenarioCounts {
  highCapacityNarrowingScenarios: number
  lowReEngagementScenarios: number
  shutdownIndicators: number
  selfWorthIndicators: number
}

export interface FaceSignal {
  used: boolean
  simulatedSignal: string | null
  selfConfirmation: SelfConfirmation | null
  supportivePoints: number
}

export interface VoiceSignal {
  used: boolean
  simulatedSignal: string | null
  selfConfirmation: SelfConfirmation | null
  supportivePoints: number
}

export interface ConsentState {
  camera: boolean
  voice: boolean
  nonDiagnosticAcknowledged: boolean
  supportiveSignalsAcknowledged: boolean
  consentGiven: boolean
}

export interface UserSession {
  entryPathway: 'individual' | 'organization' | ''
  reflectionMode: ReflectionMode | null
  consent: ConsentState
  faceSignal: FaceSignal
  voiceSignal: VoiceSignal
  answers: AnswerRecord[]
  dimensionScores: DimensionScores
  scenarioCounts: ScenarioCounts
  culturalTags: CulturalTags
  finalRoute: FinalRoute
  resultMessage: string
  isDemoMode: boolean
}

export interface AnswerRecord {
  scenarioIndex: number
  questionIndex: number
  choiceKey: string
}

// ─── Scenario Data Types ──────────────────────────────────────────────────────

export type DimensionKey = keyof DimensionScores
export type CulturalTagKey = keyof CulturalTags

export interface AnswerChoice {
  key: string
  text: string
  scores: Partial<DimensionScores>
  tags?: CulturalTagKey[]
  flags?: {
    shutdownIndicator?: boolean
    selfWorthIndicator?: boolean
    lowReEngagement?: boolean
    highCapacityNarrowingScenario?: boolean
  }
}

export interface ScenarioQuestion {
  question: string
  choices: AnswerChoice[]
}

export interface Scenario {
  title: string
  scenarioText: string
  questions: ScenarioQuestion[]
}
