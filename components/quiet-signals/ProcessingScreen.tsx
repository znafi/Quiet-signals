'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProcessingScreenProps {
  onComplete: () => void
}

const lines = [
  'Looking for repeated pressure patterns',
  'Checking awareness and recovery signals',
  'Reviewing flexibility under pressure',
  'Preparing a supportive next step',
]

export default function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i += 1
      if (i < lines.length) {
        setLineIndex(i)
      } else {
        clearInterval(interval)
        setTimeout(onComplete, 800)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6" role="main" aria-live="polite" aria-label="Processing your reflection">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-12 max-w-sm w-full text-center"
      >
        {/* Animated signal orb */}
        <div className="relative w-40 h-40 flex items-center justify-center" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-gold/20"
              style={{ width: 32 + i * 24, height: 32 + i * 24 }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.15, 0.5, 0.15],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            />
          ))}
          {/* Core */}
          <motion.div
            className="w-12 h-12 rounded-full z-10 flex items-center justify-center"
            style={{ background: 'oklch(0.62 0.12 70 / 0.15)', border: '2px solid oklch(0.62 0.12 70 / 0.4)' }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Mini signal waves */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {[0, 1].map((i) => (
                <motion.path
                  key={i}
                  d={`M${4 + i * 6},12 Q${7 + i * 6},${8 - i * 2} ${10 + i * 6},12 Q${13 + i * 6},${16 + i * 2} ${16 + i * 6},12`}
                  stroke="oklch(0.62 0.12 70)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </svg>
          </motion.div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1
            className="text-3xl md:text-4xl font-light text-foreground"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Reading the quiet signals…
          </h1>

          {/* Rotating lines */}
          <div className="h-8 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={lineIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-sm text-muted-foreground"
              >
                {lines[lineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2" aria-label={`Step ${lineIndex + 1} of ${lines.length}`} role="progressbar" aria-valuenow={lineIndex + 1} aria-valuemax={lines.length}>
          {lines.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: i === lineIndex ? 20 : 6,
                height: 6,
                background: i <= lineIndex ? 'oklch(0.62 0.12 70)' : 'oklch(0.88 0.018 70)',
              }}
              animate={{ width: i === lineIndex ? 20 : 6 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    </main>
  )
}
