'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import type { UserSession, ReflectionMode, SelfConfirmation, AnswerChoice, QuizContent, UserContactInfo } from '@/lib/quiet-signals/types'

import {
  createDefaultSession,
  applyAnswerScore,
  finalizeSession,
  runDemoProfile,
} from '@/lib/quiet-signals/scoring'
import { DEFAULT_QUIZ_CONTENT } from '@/lib/quiet-signals/scenarios'
import { getQuizContent, saveUserResult } from '@/lib/quiet-signals/firestore'
import { AccessibilityProvider, useAccessibility } from '@/hooks/useAccessibility'
import LandingScreen from './LandingScreen'
import PathwayScreen from './PathwayScreen'
import ConsentScreen from './ConsentScreen'
import FaceScreen from './FaceScreen'
import VoiceScreen from './VoiceScreen'
import ScenarioScreen from './ScenarioScreen'
import ProcessingScreen from './ProcessingScreen'
import EmailCaptureScreen from './EmailCaptureScreen'
import ResultsScreen from './ResultsScreen'
import HowItWorksScreen from './HowItWorksScreen'
import ContactScreen from './ContactScreen'

type Screen =
  | 'landing'
  | 'pathway'
  | 'consent'
  | 'face'
  | 'voice'
  | 'scenario'
  | 'processing'
  | 'email-capture'
  | 'results'
  | 'how-it-works'
  | 'contact'


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
  return (
    <AccessibilityProvider>
      <QuietSignalsAppInner />
    </AccessibilityProvider>
  )
}

function QuietSignalsAppInner() {
  const { effectiveCalm } = useAccessibility()
  const [screen, setScreen] = useState<Screen>('landing')
  const [session, setSession] = useState<UserSession>(createDefaultSession())
  const [quizContent, setQuizContent] = useState<QuizContent>(DEFAULT_QUIZ_CONTENT)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ─── Navigation helpers ──────────────────────────────────────────────────────

  const goTo = (s: Screen) => setScreen(s)

  useEffect(() => {
    let isMounted = true

    getQuizContent()
      .then((content) => {
        if (isMounted) setQuizContent(content)
      })
      .finally(() => {
        if (isMounted) setIsLoadingQuiz(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const restart = useCallback(() => {
    setSession(createDefaultSession())
    setScenarioIndex(0)
    setQuestionIndex(0)
    setSaveError(null)
    setScreen('landing')
  }, [])

  const handleStart = () => {
    goTo('pathway')
  }

  const handleEmailCapture = async (contactInfo: UserContactInfo) => {
    const updatedSession = { ...session, contactInfo }
    setSession(updatedSession)
    const saveResult = await saveUserResult(updatedSession)
    if (saveResult.ok) {
      setSaveError(null)
      setSession({ ...updatedSession, resultId: saveResult.id })
    } else {
      setSaveError(saveResult.message)
    }
    goTo('results')
  }

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
        camera: mode === 'camera-and-voice' || mode === 'camera-only',
        voice: mode === 'camera-and-voice' || mode === 'voice-only',
        nonDiagnosticAcknowledged: true,
        supportiveSignalsAcknowledged: true,
        consentGiven: true,
      },
    }))

    if (mode === 'camera-and-voice' || mode === 'camera-only') {
      goTo('face')
    } else if (mode === 'voice-only') {
      goTo('voice')
    } else {
      goTo('scenario')
    }
  }

  // ─── Face signal ─────────────────────────────────────────────────────────────

  const handleFaceContinue = (
    confirmation: SelfConfirmation | null,
    pts: number,
    signalDescription: string | null = null,
  ) => {
    setSession((s) => ({
      ...s,
      faceSignal: {
        used: true,
        simulatedSignal: signalDescription ?? 'low-confidence read',
        selfConfirmation: confirmation,
        supportivePoints: pts,
      },
    }))
    if (session.reflectionMode === 'camera-and-voice') {
      goTo('voice')
    } else {
      goTo('scenario') // camera-only → straight to scenarios
    }
  }

  const handleFaceSkip = () => {
    setSession((s) => ({ ...s, faceSignal: { ...s.faceSignal, used: false } }))
    if (session.reflectionMode === 'camera-and-voice') {
      goTo('voice')
    } else {
      goTo('scenario') // camera-only → straight to scenarios
    }
  }

  // ─── Voice signal ─────────────────────────────────────────────────────────────

  const handleVoiceContinue = (
    confirmation: SelfConfirmation | null,
    pts: number,
    signalDescription: string | null = null,
  ) => {
    setSession((s) => ({
      ...s,
      voiceSignal: {
        used: true,
        simulatedSignal: signalDescription ?? 'low-confidence read',
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

  const handleAnswer = async (choice: AnswerChoice) => {
    const scoredSession = applyAnswerScore(session, choice)
    const updatedSession = {
      ...scoredSession,
      answers: [
        ...scoredSession.answers,
        {
          scenarioIndex,
          questionIndex,
          choiceKey: choice.key,
        },
      ],
    }

    const scenario = quizContent.questions[scenarioIndex]
    const isLastQuestion = questionIndex >= scenario.questions.length - 1
    const isLastScenario = scenarioIndex >= quizContent.questions.length - 1

    if (isLastQuestion && isLastScenario) {
      const finalizedSession = finalizeSession(updatedSession, quizContent.resultMappings)
      setSession(finalizedSession)
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
      const prevScenario = quizContent.questions[scenarioIndex - 1]
      setScenarioIndex((i) => i - 1)
      setQuestionIndex(prevScenario.questions.length - 1)
    } else {
      if (session.reflectionMode === 'camera-and-voice' || session.reflectionMode === 'voice-only') {
        goTo('voice')
      } else if (session.reflectionMode === 'camera-only') {
        goTo('face')
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

  // Friendly screen labels so a single live region can announce navigation.
  const screenLabels: Record<Screen, string> = {
    landing: 'Landing screen',
    pathway: 'Pathway selection',
    consent: 'Reflection mode and accessibility options',
    face: 'Optional camera reflection',
    voice: 'Optional voice reflection',
    scenario: 'Scenario reflection',
    processing: 'Reading your reflection',
    'email-capture': 'Email capture before your report',
    results: 'Your reflection results',
    'how-it-works': 'How Quiet Signals works',
    contact: 'Contact form',
  }

  return (
    <MotionConfig reducedMotion={effectiveCalm ? 'always' : 'user'}>
      <div className="min-h-screen bg-background">
        <p
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {screenLabels[screen]}
        </p>
      {screen === 'landing' && (
        <PageTransition screenKey="landing">
          <LandingScreen
            onStart={handleStart}
            onHowItWorks={() => goTo('how-it-works')}
            onContactUs={() => goTo('contact')}
          />
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
          {isLoadingQuiz ? (
            <ProcessingScreen onComplete={() => {}} />
          ) : (
            <ScenarioScreen
              scenarios={quizContent.questions}
              scenarioIndex={scenarioIndex}
              questionIndex={questionIndex}
              onAnswer={handleAnswer}
              onBack={handleScenarioBack}
            />
          )}
        </PageTransition>
      )}

      {screen === 'processing' && (
        <PageTransition screenKey="processing">
          <ProcessingScreen onComplete={() => goTo('email-capture')} />
        </PageTransition>
      )}

      {screen === 'email-capture' && (
        <PageTransition screenKey="email-capture">
          <EmailCaptureScreen onSubmit={handleEmailCapture} />
        </PageTransition>
      )}

      {screen === 'results' && (
        <PageTransition screenKey="results">
          <ResultsScreen
            session={session}
            resources={quizContent.resources}
            resultMappings={quizContent.resultMappings}
            saveError={saveError}
            onRestart={restart}
          />
        </PageTransition>
      )}

      {screen === 'contact' && (
        <PageTransition screenKey="contact">
          <ContactScreen onBack={() => goTo('landing')} />
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
    </MotionConfig>
  )
}
