'use client'

import { useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Info } from 'lucide-react'
import type { AnswerChoice, Scenario } from '@/lib/quiet-signals/types'
import meetingImage from '@/components/ui/meeting.png'
import morningImage from '@/components/ui/morning.png'
import urgentTaskImage from '@/components/ui/urgenttask.png'

interface ScenarioScreenProps {
  scenarios: Scenario[]
  scenarioIndex: number
  questionIndex: number
  onAnswer: (choice: AnswerChoice) => void | Promise<void>
  onBack: () => void
}

interface ScenarioIllustration {
  src: StaticImageData
  alt: string
}

const scenarioIllustrations: Record<string, ScenarioIllustration> = {
  'scenario-1': {
    src: morningImage,
    alt: 'Illustration of a worker arriving at a desk on Monday morning with coffee and a computer.',
  },
  'Monday morning': {
    src: morningImage,
    alt: 'Illustration of a worker arriving at a desk on Monday morning with coffee and a computer.',
  },
  'scenario-2': {
    src: urgentTaskImage,
    alt: 'Illustration of a worker looking at an urgent message from their manager with a deadline icon.',
  },
  'Urgent task': {
    src: urgentTaskImage,
    alt: 'Illustration of a worker looking at an urgent message from their manager with a deadline icon.',
  },
  'scenario-3': {
    src: meetingImage,
    alt: 'Illustration of coworkers in a team meeting discussing a project update.',
  },
  'Team meeting': {
    src: meetingImage,
    alt: 'Illustration of coworkers in a team meeting discussing a project update.',
  },
}

function getScenarioIllustration(scenario: Scenario) {
  return (scenario.id ? scenarioIllustrations[scenario.id] : undefined) ?? scenarioIllustrations[scenario.title]
}

export default function ScenarioScreen({ scenarios, scenarioIndex, questionIndex, onAnswer, onBack }: ScenarioScreenProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null)
  const scenario = scenarios[scenarioIndex]
  const question = scenario.questions[questionIndex]
  const scenarioIllustration = getScenarioIllustration(scenario)

  const totalScenarios = scenarios.length
  const totalQuestions = scenario.questions.length
  const overallStep = scenarios.slice(0, scenarioIndex).reduce((acc, s) => acc + s.questions.length, 0) + questionIndex + 1
  const overallTotal = scenarios.reduce((acc, s) => acc + s.questions.length, 0)
  const progressPct = Math.round((overallStep / overallTotal) * 100)

  const handleSelect = (key: string) => setSelected(key)

  const handleToggleInfo = (key: string) => {
    setExpandedInfo((current) => (current === key ? null : key))
  }

  const handleChoiceKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect(key)
    }
  }

  const handleContinue = () => {
    if (!selected) return
    const choice = question.choices.find((c) => c.key === selected)
    if (choice) {
      setSelected(null)
      setExpandedInfo(null)
      onAnswer(choice)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      {/* Top nav */}
      <div className="px-6 pt-6 md:px-10 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back to previous question"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <div className="text-xs text-muted-foreground" aria-label={`Scenario ${scenarioIndex + 1} of ${totalScenarios}, question ${questionIndex + 1} of ${totalQuestions}`}>
          Scenario {scenarioIndex + 1} of {totalScenarios} &middot; Question {questionIndex + 1} of {totalQuestions}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 md:px-10 mt-4" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Overall progress: ${progressPct}%`}>
        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'oklch(0.62 0.12 70)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-right">{progressPct}% complete</p>
      </div>

      <section className="flex-1 flex flex-col px-6 py-6 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${scenarioIndex}-${questionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col gap-6 h-full"
          >
            {/* Scenario context */}
            <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-4 overflow-hidden">
              {scenarioIllustration ? (
                <div className="-mx-5 -mt-5 mb-1 border-b border-warm-border bg-sand/40">
                  <Image
                    src={scenarioIllustration.src}
                    alt={scenarioIllustration.alt}
                    placeholder="blur"
                    sizes="(min-width: 768px) 768px, calc(100vw - 48px)"
                    className="h-auto w-full max-h-[280px] object-cover object-center"
                    priority={scenarioIndex === 1}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium tracking-widest uppercase text-gold">Scenario {scenarioIndex + 1}</span>
                </div>
                <h2
                  className="text-xl font-medium text-foreground"
                  style={{ fontFamily: 'var(--font-cormorant)' }}
                >
                  {scenario.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {scenario.scenarioText}
                </p>
              </div>
            </div>

            {/* Question */}
            <div data-guide-target="scenario-question" className="space-y-1">
              <p className="text-xs text-muted-foreground italic">There are no right or wrong answers.</p>
              <h3
                className="text-2xl md:text-[1.75rem] font-light text-foreground leading-snug"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                {question.question}
              </h3>
            </div>

            {/* Answer choices */}
            <fieldset className="flex-1">
              <legend className="sr-only">{question.question}</legend>
              <div data-guide-target="scenario-answers" className="space-y-2.5">
                {question.choices.map((choice) => {
                  const isSelected = selected === choice.key
                  const isInfoExpanded = expandedInfo === choice.key
                  const infoId = `choice-info-${scenarioIndex}-${questionIndex}-${choice.key}`
                  return (
                    <motion.div
                      key={choice.key}
                      onClick={() => handleSelect(choice.key)}
                      onKeyDown={(event) => handleChoiceKeyDown(event, choice.key)}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        isSelected
                          ? 'border-gold bg-gold/5'
                          : 'border-warm-border bg-card hover:border-gold/40'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                      aria-describedby={isInfoExpanded ? infoId : undefined}
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            isSelected ? 'border-gold bg-gold' : 'border-muted-foreground/30'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="flex-1 text-left text-sm text-foreground leading-relaxed">
                          {choice.text}
                        </span>
                        {choice.description ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleToggleInfo(choice.key)
                            }}
                            className="w-8 h-8 rounded-full border border-warm-border flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:border-gold/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                            aria-label={`${isInfoExpanded ? 'Hide' : 'Show'} more context for option ${choice.key}`}
                            aria-expanded={isInfoExpanded}
                            aria-controls={infoId}
                          >
                            <Info className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                      {choice.description ? (
                        <AnimatePresence initial={false}>
                          {isInfoExpanded && (
                            <motion.p
                              id={infoId}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="overflow-hidden pl-9 pr-10 pt-3 text-xs text-muted-foreground leading-relaxed"
                            >
                              {choice.description}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      ) : null}
                    </motion.div>
                  )
                })}
              </div>
            </fieldset>

            {/* Continue */}
            <motion.button
              data-guide-target="continue-button"
              onClick={handleContinue}
              disabled={!selected}
              whileHover={selected ? { scale: 1.01 } : {}}
              whileTap={selected ? { scale: 0.99 } : {}}
              className={`w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selected ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
              style={selected ? { background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' } : { background: 'oklch(0.88 0.018 70)', color: 'oklch(0.52 0.02 65)' }}
              aria-disabled={!selected}
            >
              Continue
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}
