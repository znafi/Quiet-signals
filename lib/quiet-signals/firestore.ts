import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase/client'
import { DEFAULT_QUIZ_CONTENT } from './scenarios'
import type { QuizContent, Resource, UserContactInfo, UserSession } from './types'

function byOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function getQuizContent(): Promise<QuizContent> {
  const db = getFirebaseDb()
  if (!db) return DEFAULT_QUIZ_CONTENT

  try {
    const resourcesSnapshot = await getDocs(query(collection(db, 'resources'), orderBy('order')))
    const resources = resourcesSnapshot.docs.map((resourceDoc) => ({
      id: resourceDoc.id,
      ...resourceDoc.data(),
    })) as Resource[]

    return {
      questions: DEFAULT_QUIZ_CONTENT.questions,
      resources: resources.length ? byOrder(resources) : DEFAULT_QUIZ_CONTENT.resources,
      resultMappings: DEFAULT_QUIZ_CONTENT.resultMappings,
    }
  } catch (error) {
    console.warn('Falling back to bundled quiz content after Firestore read failed.', error)
    return DEFAULT_QUIZ_CONTENT
  }
}

export async function saveUserResult(session: UserSession): Promise<string | null> {
  const db = getFirebaseDb()
  if (!db || !session.contactInfo?.consentToStoreContact) return null

  const contactInfo = {
    email: session.contactInfo.email.trim().toLowerCase(),
    name: session.contactInfo.name.trim(),
  }

  try {
    const resultDoc = await addDoc(collection(db, 'userResults'), {
      answers: session.answers,
      burnoutSignal: session.burnoutSignal,
      consentToStoreContact: true,
      consent: session.consent,
      createdAt: serverTimestamp(),
      dimensionScores: session.dimensionScores,
      email: contactInfo.email,
      entryPathway: session.entryPathway,
      faceSignal: session.faceSignal,
      name: contactInfo.name,
      privacyVersion: '2026-05-09',
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

export async function saveUserContact(
  contact: UserContactInfo,
  session: UserSession
): Promise<string | null> {
  const db = getFirebaseDb()
  if (!db || !contact.consentToStoreContact) return null

  try {
    const contactDoc = await addDoc(collection(db, 'userContacts'), {
      burnoutSignal: session.burnoutSignal,
      consentToStoreContact: true,
      createdAt: serverTimestamp(),
      dimensionScores: session.dimensionScores,
      email: contact.email.trim().toLowerCase(),
      entryPathway: session.entryPathway,
      name: contact.name.trim(),
      privacyVersion: '2026-05-09',
      reflectionMode: session.reflectionMode,
      resultId: session.resultId ?? null,
      totalScore: session.totalScore,
    })

    return contactDoc.id
  } catch (error) {
    console.warn('Unable to save user contact to Firestore.', error)
    return null
  }
}
