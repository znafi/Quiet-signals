import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase/client'
import { DEFAULT_QUIZ_CONTENT } from './scenarios'
import type { QuizContent, Resource, ResultMapping, Scenario, UserSession } from './types'

function byOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getQuizContent(): Promise<QuizContent> {
  const db = getFirebaseDb()
  if (!db) return DEFAULT_QUIZ_CONTENT

  try {
    const [questionSnapshot, resourcesSnapshot, mappingsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'questions'), orderBy('order'))),
      getDocs(query(collection(db, 'resources'), orderBy('order'))),
      getDocs(query(collection(db, 'resultMappings'), orderBy('minScore'))),
    ])

    const questions = questionSnapshot.docs.map((questionDoc) => ({
      id: questionDoc.id,
      ...questionDoc.data(),
    })) as Scenario[]

    const resources = resourcesSnapshot.docs.map((resourceDoc) => ({
      id: resourceDoc.id,
      ...resourceDoc.data(),
    })) as Resource[]

    const resultMappings = mappingsSnapshot.docs.map((mappingDoc) => ({
      ...mappingDoc.data(),
    })) as ResultMapping[]

    return {
      questions: questions.length ? byOrder(questions) : DEFAULT_QUIZ_CONTENT.questions,
      resources: resources.length ? byOrder(resources) : DEFAULT_QUIZ_CONTENT.resources,
      resultMappings: resultMappings.length ? resultMappings : DEFAULT_QUIZ_CONTENT.resultMappings,
    }
  } catch (error) {
    console.warn('Falling back to bundled quiz content after Firestore read failed.', error)
    return DEFAULT_QUIZ_CONTENT
  }
}

export async function saveUserResult(session: UserSession): Promise<string | null> {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const resultDoc = await addDoc(collection(db, 'userResults'), {
      answers: session.answers,
      burnoutSignal: session.burnoutSignal,
      consent: session.consent,
      createdAt: serverTimestamp(),
      dimensionScores: session.dimensionScores,
      entryPathway: session.entryPathway,
      faceSignal: session.faceSignal,
      reflectionMode: session.reflectionMode,
      totalScore: session.totalScore,
      voiceSignal: session.voiceSignal,
    })

    return resultDoc.id
  } catch (error) {
    console.warn('Unable to save user result to Firestore.', error)
    return null
  }
}

export async function seedQuizContent(content: QuizContent = DEFAULT_QUIZ_CONTENT): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase is not configured.')

  await Promise.all([
    ...content.questions.map((scenario, index) =>
      setDoc(doc(db, 'questions', scenario.id ?? `scenario-${index + 1}`), {
        ...scenario,
        order: scenario.order ?? index + 1,
      })
    ),
    ...content.resources.map((resource, index) =>
      setDoc(doc(db, 'resources', resource.id ?? `resource-${index + 1}`), {
        ...resource,
        order: resource.order ?? index + 1,
      })
    ),
    ...content.resultMappings.map((mapping) =>
      setDoc(doc(db, 'resultMappings', mapping.signal.toLowerCase()), mapping)
    ),
  ])
}
