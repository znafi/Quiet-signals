import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfigFallback = {
  apiKey: 'AIzaSyCbvq5EYim-OpQoe0oPxSbyNMob2SPhPDQ',
  authDomain: 'quietsignals-4b2dd.firebaseapp.com',
  projectId: 'quietsignals-4b2dd',
  storageBucket: 'quietsignals-4b2dd.firebasestorage.app',
  messagingSenderId: '663537025620',
  appId: '1:663537025620:web:5c179090086becef56e3c1',
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigFallback.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigFallback.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigFallback.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigFallback.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFallback.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigFallback.appId,
}

export function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  )
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) return null
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}
