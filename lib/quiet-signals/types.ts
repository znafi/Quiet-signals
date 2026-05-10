// ─── Types ────────────────────────────────────────────────────────────────────

export type SelfConfirmation = 'yes' | 'somewhat' | 'no' | 'unsure'

export type ReflectionMode = 'camera-and-voice' | 'camera-only' | 'voice-only' | 'text-only'

export type BurnoutSignal = 'Low' | 'Moderate' | 'High'

export interface DimensionScores {
  exhaustion: number
  mentalDistancing: number
  cognitiveImpairment: number
  emotionalImpairment: number
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
  contactInfo: UserContactInfo | null
  reflectionMode: ReflectionMode | null
  consent: ConsentState
  faceSignal: FaceSignal
  voiceSignal: VoiceSignal
  answers: AnswerRecord[]
  dimensionScores: DimensionScores
  totalScore: number
  burnoutSignal: BurnoutSignal | ''
  resultMessage: string
  isDemoMode: boolean
  resultId?: string
}

export interface AnswerRecord {
  scenarioIndex: number
  questionIndex: number
  choiceKey: string
}

export interface UserContactInfo {
  name: string
  email: string
  consentToStoreContact: boolean
}

// ─── Scenario Data Types ──────────────────────────────────────────────────────

export type DimensionKey = keyof DimensionScores

export interface AnswerChoice {
  key: string
  text: string
  description?: string
  scores: Partial<DimensionScores>
}

export interface ScenarioQuestion {
  dimension: DimensionKey
  question: string
  choices: AnswerChoice[]
}

export interface Scenario {
  id?: string
  order?: number
  title: string
  scenarioText: string
  questions: ScenarioQuestion[]
}

export interface ResultMapping {
  signal: BurnoutSignal
  minScore: number
  maxScore: number
  title: string
  description: string
  recommendation: string
}

export interface Resource {
  id?: string
  title: string
  description: string
  url?: string
  signal?: BurnoutSignal | 'All'
  order?: number
}

export interface QuizContent {
  questions: Scenario[]
  resources: Resource[]
  resultMappings: ResultMapping[]
}
