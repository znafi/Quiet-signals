'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { UserSession, ReflectionMode, SelfConfirmation, AnswerChoice } from '@/lib/quiet-signals/types'
import {
  createDefaultSession,
  applyAnswerScore,
  calculateFinalRoute,
  runDemoProfile,
} from '@/lib/quiet-signals/scoring'
import { SCENARIOS } from '@/lib/quiet-signals/scenarios'

import LandingScreen from './LandingScreen'
import PathwayScreen from './PathwayScreen'
import ConsentScreen from './ConsentScreen'
import FaceScreen from './FaceScreen'
import VoiceScreen from './VoiceScreen'
import ScenarioScreen from './ScenarioScreen'
import ProcessingScreen from './ProcessingScreen'
import ResultsScreen from './ResultsScreen'
import EmailScreen from './EmailScreen'
import HowItWorksScreen from './HowItWorksScreen'

type Screen =
  | 'landing'
  | 'pathway'
  | 'consent'
  | 'face'
  | 'voice'
  | 'scenario'
  | 'processing'
  | 'results'
  | 'email'
  | 'how-it-works'

function PageTransition({ children, screenKey }: { children: React.ReactNode; screenKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default function QuietSignalsApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [session, setSession] = useState<UserSession>(createDefaultSession())
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)

  // ─── Navigation helpers ──────────────────────────────────────────────────────

  const goTo = (s: Screen) => setScreen(s)

  const restart = useCallback(() => {
    setSession(createDefaultSession())
    setScenarioIndex(0)
    setQuestionIndex(0)
    setScreen('landing')
  }, [])

  // ─── Pathway ─────────────────────────────────────────────────────────────────

  const handleSelectIndividual = () => {
    setSession((s) => ({ ...s, entryPathway: 'individual' }))
    goTo('consent')
  }

  // ─── Consent ─────────────────────────────────────────────────────────────────

  const handleConsentContinue = (mode: ReflectionMode) => {
    setSession((s) => ({
      ...s,
      reflectionMode: mode,
      consent: {
        camera: mode === 'camera-and-voice',
        voice: mode === 'camera-and-voice' || mode === 'voice-only',
        nonDiagnosticAcknowledged: true,
        supportiveSignalsAcknowledged: true,
        consentGiven: true,
      },
    }))

    if (mode === 'camera-and-voice') {
      goTo('face')
    } else if (mode === 'voice-only') {
      goTo('voice')
    } else {
      goTo('scenario')
    }
  }

  // ─── Face signal ─────────────────────────────────────────────────────────────

  const handleFaceContinue = (confirmation: SelfConfirmation | null, pts: number) => {
    setSession((s) => ({
      ...s,
      faceSignal: {
        used: true,
        simulatedSignal: 'possible tension or low energy',
        selfConfirmation: confirmation,
        supportivePoints: pts,
      },
    }))
    if (session.reflectionMode === 'camera-and-voice') {
      goTo('voice')
    } else {
      goTo('scenario')
    }
  }

  const handleFaceSkip = () => {
    setSession((s) => ({ ...s, faceSignal: { ...s.faceSignal, used: false } }))
    if (session.reflectionMode === 'camera-and-voice') {
      goTo('voice')
    } else {
      goTo('scenario')
    }
  }

  // ─── Voice signal ─────────────────────────────────────────────────────────────

  const handleVoiceContinue = (confirmation: SelfConfirmation | null, pts: number) => {
    setSession((s) => ({
      ...s,
      voiceSignal: {
        used: true,
        simulatedSignal: 'possible pressure signal',
        selfConfirmation: confirmation,
        supportivePoints: pts,
      },
    }))
    goTo('scenario')
  }

  const handleVoiceSkip = () => {
    setSession((s) => ({ ...s, voiceSignal: { ...s.voiceSignal, used: false } }))
    goTo('scenario')
  }

  // ─── Scenario answers ─────────────────────────────────────────────────────────

  const handleAnswer = (choice: AnswerChoice) => {
    const updatedSession = applyAnswerScore(session, choice)

    const scenario = SCENARIOS[scenarioIndex]
    const isLastQuestion = questionIndex >= scenario.questions.length - 1
    const isLastScenario = scenarioIndex >= SCENARIOS.length - 1

    if (isLastQuestion && isLastScenario) {
      // Done — calculate route
      const route = calculateFinalRoute(updatedSession)
      setSession({ ...updatedSession, finalRoute: route })
      goTo('processing')
    } else if (isLastQuestion) {
      setSession(updatedSession)
      setScenarioIndex((i) => i + 1)
      setQuestionIndex(0)
    } else {
      setSession(updatedSession)
      setQuestionIndex((q) => q + 1)
    }
  }

  const handleScenarioBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex((q) => q - 1)
    } else if (scenarioIndex > 0) {
      const prevScenario = SCENARIOS[scenarioIndex - 1]
      setScenarioIndex((i) => i - 1)
      setQuestionIndex(prevScenario.questions.length - 1)
    } else {
      // Back to voice or consent
      if (session.reflectionMode === 'camera-and-voice' || session.reflectionMode === 'voice-only') {
        goTo('voice')
      } else {
        goTo('consent')
      }
    }
  }

  // ─── Demo mode ───────────────────────────────────────────────────────────────

  const handleRunDemo = (profileType: 'coaching' | 'mixed' | 'strain') => {
    const demoSession = runDemoProfile(profileType)
    setSession(demoSession)
    goTo('results')
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {screen === 'landing' && (
        <PageTransition screenKey="landing">
          <LandingScreen onStart={() => goTo('pathway')} onHowItWorks={() => goTo('how-it-works')} />
        </PageTransition>
      )}

      {screen === 'pathway' && (
        <PageTransition screenKey="pathway">
          <PathwayScreen onSelectIndividual={handleSelectIndividual} onBack={() => goTo('landing')} />
        </PageTransition>
      )}

      {screen === 'consent' && (
        <PageTransition screenKey="consent">
          <ConsentScreen onContinue={handleConsentContinue} onBack={() => goTo('pathway')} />
        </PageTransition>
      )}

      {screen === 'face' && (
        <PageTransition screenKey="face">
          <FaceScreen
            onContinue={handleFaceContinue}
            onSkip={handleFaceSkip}
            onBack={() => goTo('consent')}
          />
        </PageTransition>
      )}

      {screen === 'voice' && (
        <PageTransition screenKey="voice">
          <VoiceScreen
            onContinue={handleVoiceContinue}
            onSkip={handleVoiceSkip}
            onBack={() => {
              if (session.reflectionMode === 'camera-and-voice') {
                goTo('face')
              } else {
                goTo('consent')
              }
            }}
          />
        </PageTransition>
      )}

      {screen === 'scenario' && (
        <PageTransition screenKey={`scenario-${scenarioIndex}-${questionIndex}`}>
          <ScenarioScreen
            scenarioIndex={scenarioIndex}
            questionIndex={questionIndex}
            onAnswer={handleAnswer}
            onBack={handleScenarioBack}
          />
        </PageTransition>
      )}

      {screen === 'processing' && (
        <PageTransition screenKey="processing">
          <ProcessingScreen onComplete={() => goTo('results')} />
        </PageTransition>
      )}

      {screen === 'results' && (
        <PageTransition screenKey="results">
          <ResultsScreen
            session={session}
            onEmailCapture={() => goTo('email')}
            onRestart={restart}
          />
        </PageTransition>
      )}

      {screen === 'email' && (
        <PageTransition screenKey="email">
          <EmailScreen onBack={() => goTo('results')} onRestart={restart} />
        </PageTransition>
      )}

      {screen === 'how-it-works' && (
        <PageTransition screenKey="how-it-works">
          <HowItWorksScreen
            onBack={() => goTo('landing')}
            onRunDemo={handleRunDemo}
          />
        </PageTransition>
      )}
    </div>
  )
}
