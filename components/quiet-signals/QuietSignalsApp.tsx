'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { UserSession, ReflectionMode, SelfConfirmation, AnswerChoice, QuizContent, UserContactInfo } from '@/lib/quiet-signals/types'
import {
  createDefaultSession,
  applyAnswerScore,
  finalizeSession,
  runDemoProfile,
} from '@/lib/quiet-signals/scoring'
import { DEFAULT_QUIZ_CONTENT } from '@/lib/quiet-signals/scenarios'
import { getQuizContent, saveUserResult } from '@/lib/quiet-signals/firestore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import LandingScreen from './LandingScreen'
import PathwayScreen from './PathwayScreen'
import ConsentScreen from './ConsentScreen'
import FaceScreen from './FaceScreen'
import VoiceScreen from './VoiceScreen'
import ScenarioScreen from './ScenarioScreen'
import ProcessingScreen from './ProcessingScreen'
import ResultsScreen from './ResultsScreen'
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
  | 'how-it-works'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function ContactCaptureDialog({
  open,
  onSubmit,
}: {
  open: boolean
  onSubmit: (contactInfo: UserContactInfo) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)
  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const canSubmit = trimmedName.length > 1 && EMAIL_PATTERN.test(trimmedEmail) && consented

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    onSubmit({
      name: trimmedName,
      email: trimmedEmail,
      consentToStoreContact: consented,
    })
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-md rounded-2xl border-warm-border p-0 overflow-hidden"
      >
        <div className="p-6 sm:p-7 space-y-6">
          <DialogHeader className="text-left space-y-3">
            <DialogTitle
              className="text-3xl font-light leading-tight text-foreground"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Before you begin
            </DialogTitle>
            <div className="w-10 h-px bg-gold" aria-hidden="true" />
            <DialogDescription className="leading-relaxed">
              Quiet Signals stores your name and email with your score summary. These details are required to use the tool.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-ring transition-colors"
                aria-required="true"
                autoComplete="name"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-warm-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-ring transition-colors"
                aria-required="true"
                autoComplete="email"
                maxLength={254}
              />
            </div>

            <label htmlFor="contact-consent" className="flex items-start gap-3 cursor-pointer group">
              <span className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  id="contact-consent"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="sr-only"
                  aria-label="I consent to Quiet Signals storing my contact details with my score summary"
                />
                <span
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    consented ? 'bg-gold border-gold' : 'border-warm-border bg-background group-hover:border-gold/60'
                  }`}
                  aria-hidden="true"
                >
                  {consented && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                I consent to Quiet Signals storing my name, email, and score summary. I understand this reflection is not a diagnosis.
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                canSubmit ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
              style={canSubmit ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
              aria-disabled={!canSubmit}
            >
              Continue
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function QuietSignalsApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [session, setSession] = useState<UserSession>(createDefaultSession())
  const [quizContent, setQuizContent] = useState<QuizContent>(DEFAULT_QUIZ_CONTENT)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true)
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)

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
    setIsContactDialogOpen(false)
    setScreen('landing')
  }, [])

  const handleStart = () => {
    setIsContactDialogOpen(true)
  }

  const handleContactSubmit = (contactInfo: UserContactInfo) => {
    setSession((s) => ({ ...s, contactInfo }))
    setIsContactDialogOpen(false)
    goTo('pathway')
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
      const resultId = await saveUserResult(finalizedSession)
      setSession(resultId ? { ...finalizedSession, resultId } : finalizedSession)
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
      <ContactCaptureDialog open={isContactDialogOpen} onSubmit={handleContactSubmit} />

      {screen === 'landing' && (
        <PageTransition screenKey="landing">
          <LandingScreen onStart={handleStart} onHowItWorks={() => goTo('how-it-works')} />
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
          <ProcessingScreen onComplete={() => goTo('results')} />
        </PageTransition>
      )}

      {screen === 'results' && (
        <PageTransition screenKey="results">
          <ResultsScreen
            session={session}
            resources={quizContent.resources}
            resultMappings={quizContent.resultMappings}
            onRestart={restart}
          />
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
