import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { DEFAULT_QUIZ_CONTENT } from '@/lib/quiet-signals/scenarios'
import type { AnswerRecord, BurnoutSignal, DimensionScores, FaceSignal, ReflectionMode, UserSession, VoiceSignal } from '@/lib/quiet-signals/types'
import { getScoreLevel } from '@/lib/quiet-signals/scoring'

export const runtime = 'nodejs'

type ResultSnapshot = {
  name?: string | null
  burnoutSignal: BurnoutSignal | ''
  dimensionScores: DimensionScores
  faceSignal: FaceSignal
  voiceSignal: VoiceSignal
  reflectionMode: ReflectionMode | null
  totalScore: number
  answers?: AnswerRecord[]
}

const dimensionLabels: Record<keyof DimensionScores, string> = {
  exhaustion: 'emotional and physical exhaustion',
  mentalDistancing: 'feeling detached from work',
  cognitiveImpairment: 'difficulty focusing or thinking clearly',
  emotionalImpairment: 'stronger emotional reactions at work',
}

const fallbackSummary =
  'Your answers point to workplace stress patterns that may be worth naming. This is not a diagnosis, but it can help you reflect on what feels heavy and what support may be useful right now.'
const terminalPunctuationPattern = /[.!?]$/

function isDimensionScores(value: unknown): value is DimensionScores {
  if (!value || typeof value !== 'object') return false
  const scores = value as Partial<Record<keyof DimensionScores, unknown>>
  return (
    typeof scores.exhaustion === 'number' &&
    typeof scores.mentalDistancing === 'number' &&
    typeof scores.cognitiveImpairment === 'number' &&
    typeof scores.emotionalImpairment === 'number'
  )
}

function isResultSnapshot(value: unknown): value is ResultSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<ResultSnapshot>
  return (
    isDimensionScores(snapshot.dimensionScores) &&
    typeof snapshot.totalScore === 'number' &&
    typeof snapshot.faceSignal === 'object' &&
    typeof snapshot.voiceSignal === 'object' &&
    (snapshot.answers === undefined || Array.isArray(snapshot.answers))
  )
}

function snapshotFromSession(session: UserSession): ResultSnapshot {
  return {
    name: session.contactInfo?.name?.split(/\s+/)[0] ?? null,
    burnoutSignal: session.burnoutSignal,
    dimensionScores: session.dimensionScores,
    faceSignal: session.faceSignal,
    voiceSignal: session.voiceSignal,
    reflectionMode: session.reflectionMode,
    totalScore: session.totalScore,
    answers: session.answers,
  }
}

async function getSnapshotFromFirestore(resultId: string): Promise<ResultSnapshot | null> {
  const db = getFirebaseAdminDb()
  if (!db) return null

  const doc = await db.collection('userResults').doc(resultId).get()
  if (!doc.exists) return null

  const data = doc.data()
  if (!isResultSnapshot(data)) return null

  return {
    name: typeof data.name === 'string' ? data.name.split(/\s+/)[0] : null,
    burnoutSignal: data.burnoutSignal,
    dimensionScores: data.dimensionScores,
    faceSignal: data.faceSignal,
    voiceSignal: data.voiceSignal,
    reflectionMode: data.reflectionMode,
    totalScore: data.totalScore,
    answers: Array.isArray(data.answers) ? data.answers : [],
  }
}

function getMainThemes(scores: DimensionScores): string[] {
  const themes = Object.entries(scores)
    .filter(([, score]) => getScoreLevel(score) !== 'Low')
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => dimensionLabels[key as keyof DimensionScores])

  return themes.length ? themes.slice(0, 3) : ['steady work patterns with lower burnout pressure']
}

function getResponseThemes(answers: AnswerRecord[] = []): string[] {
  return answers
    .map((answer) => {
      const question = DEFAULT_QUIZ_CONTENT.questions[answer.scenarioIndex]?.questions[answer.questionIndex]
      const choice = question?.choices.find((candidate) => candidate.key === answer.choiceKey)
      const score = choice ? Object.values(choice.scores).reduce((total, value) => total + (value ?? 0), 0) : 0

      if (!question || !choice || score <= 0) return null

      return `${question.dimension}: ${choice.text}${choice.description ? ` (${choice.description})` : ''}`
    })
    .filter((theme): theme is string => Boolean(theme))
    .slice(0, 5)
}

function buildPrompt(snapshot: ResultSnapshot): string {
  const themes = getMainThemes(snapshot.dimensionScores)
  const faceSignal = snapshot.faceSignal.used
    ? `${snapshot.faceSignal.simulatedSignal ?? 'used'}, self-confirmed as ${snapshot.faceSignal.selfConfirmation ?? 'not confirmed'}`
    : 'not used'
  const voiceSignal = snapshot.voiceSignal.used
    ? `${snapshot.voiceSignal.simulatedSignal ?? 'used'}, self-confirmed as ${snapshot.voiceSignal.selfConfirmation ?? 'not confirmed'}`
    : 'not used'
  const responseThemes = getResponseThemes(snapshot.answers)

  return `Write a personalized workplace burnout reflection summary.

Use only the structured information below. Do not diagnose. Do not mention exact scores. Do not say the AI analyzed the person. Use easy language for accessibility. Be supportive, simple, non-medical, and culturally sensitive. Help the person name and verbalize what may be happening at work. Write exactly 2 complete sentences, 35-50 words total.

Structured information:
- First name: ${snapshot.name || 'the user'}
- Result category: ${snapshot.burnoutSignal || 'Unknown'} burnout signs
- Main themes: ${themes.join(', ')}
- Selected response themes: ${responseThemes.length ? responseThemes.join('; ') : 'no elevated response themes'}
- Reflection mode: ${snapshot.reflectionMode ?? 'unknown'}
- Camera/visual supportive signal: ${faceSignal}
- Voice supportive signal: ${voiceSignal}
- Required closing idea: This result is not a diagnosis, but it can help the user reflect on what support may be useful right now.`
}

function cleanSummary(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isCompleteSummary(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  return words.length >= 18 && terminalPunctuationPattern.test(text)
}

async function requestGeminiSummary(snapshot: ResultSnapshot, maxOutputTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'You write brief, accessible, non-medical workplace wellbeing summaries. Always finish complete sentences.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(snapshot) }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens,
          responseMimeType: 'text/plain',
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gemini summary request failed: ${message}`)
  }

  const data = await response.json()
  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini stopped before completing summary: ${finishReason}`)
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter((part: unknown): part is string => typeof part === 'string')
    .join(' ')

  if (!text) {
    throw new Error('Gemini returned an empty summary.')
  }

  return cleanSummary(text)
}

async function generateGeminiSummary(snapshot: ResultSnapshot): Promise<string> {
  const summary = await requestGeminiSummary(snapshot, 512)
  if (isCompleteSummary(summary)) return summary

  const retrySummary = await requestGeminiSummary(snapshot, 768)
  if (isCompleteSummary(retrySummary)) return retrySummary

  throw new Error('Gemini returned an incomplete summary.')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const resultId = typeof body.resultId === 'string' ? body.resultId : null
    const session = body.session as UserSession | undefined

    const snapshot =
      (resultId ? await getSnapshotFromFirestore(resultId) : null) ??
      (session ? snapshotFromSession(session) : null)

    if (!snapshot || !isResultSnapshot(snapshot)) {
      return NextResponse.json({ summary: fallbackSummary, source: 'fallback' }, { status: 200 })
    }

    const summary = await generateGeminiSummary(snapshot)

    if (resultId) {
      const db = getFirebaseAdminDb()
      await db?.collection('userResults').doc(resultId).set(
        {
          aiSummary: summary,
          aiSummaryProvider: 'gemini',
          aiSummaryModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          aiSummaryGeneratedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    }

    return NextResponse.json({ summary, source: resultId ? 'firestore' : 'session' })
  } catch (error) {
    console.warn('Unable to generate personalized summary.', error)
    return NextResponse.json({ summary: fallbackSummary, source: 'fallback' }, { status: 200 })
  }
}
