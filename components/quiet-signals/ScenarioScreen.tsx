'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { SCENARIOS } from '@/lib/quiet-signals/scenarios'
import type { AnswerChoice } from '@/lib/quiet-signals/types'

interface ScenarioScreenProps {
  scenarioIndex: number
  questionIndex: number
  onAnswer: (choice: AnswerChoice) => void
  onBack: () => void
}

export default function ScenarioScreen({ scenarioIndex, questionIndex, onAnswer, onBack }: ScenarioScreenProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const scenario = SCENARIOS[scenarioIndex]
  const question = scenario.questions[questionIndex]

  const totalScenarios = SCENARIOS.length
  const totalQuestions = scenario.questions.length
  const overallStep = SCENARIOS.slice(0, scenarioIndex).reduce((acc, s) => acc + s.questions.length, 0) + questionIndex + 1
  const overallTotal = SCENARIOS.reduce((acc, s) => acc + s.questions.length, 0)
  const progressPct = Math.round((overallStep / overallTotal) * 100)

  const handleSelect = (key: string) => setSelected(key)

  const handleContinue = () => {
    if (!selected) return
    const choice = question.choices.find((c) => c.key === selected)
    if (choice) {
      setSelected(null)
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

      <section className="flex-1 flex flex-col px-6 py-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${scenarioIndex}-${questionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col gap-6 h-full"
          >
            {/* Scenario title (first question only) */}
            {questionIndex === 0 && (
              <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2">
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
            )}

            {/* Question */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground italic">There are no right or wrong answers.</p>
              <h3
                className="text-2xl md:text-3xl font-light text-foreground leading-snug text-balance"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                {question.question}
              </h3>
            </div>

            {/* Answer choices */}
            <fieldset className="flex-1">
              <legend className="sr-only">{question.question}</legend>
              <div className="space-y-2.5">
                {question.choices.map((choice) => {
                  const isSelected = selected === choice.key
                  return (
                    <motion.button
                      key={choice.key}
                      onClick={() => handleSelect(choice.key)}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        isSelected
                          ? 'border-gold bg-gold/5'
                          : 'border-warm-border bg-card hover:border-gold/40'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={choice.text}
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
                        <span className="text-sm text-foreground leading-relaxed">{choice.text}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </fieldset>

            {/* Continue */}
            <motion.button
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
