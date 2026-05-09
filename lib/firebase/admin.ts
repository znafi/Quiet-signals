import { readFileSync } from 'fs'
import { resolve } from 'path'
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

function getProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined
  )
}

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccountPath = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8')))
  }

  return applicationDefault()
}

export function getFirebaseAdminDb(): Firestore | null {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: getCredential(),
        projectId: getProjectId(),
      })
    }

    return getFirestore()
  } catch (error) {
    console.warn('Firebase Admin is not configured for server-side result reads.', error)
    return null
  }
}
