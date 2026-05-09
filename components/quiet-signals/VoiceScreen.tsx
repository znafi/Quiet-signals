'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, MicOff, AlertCircle } from 'lucide-react'
import type { SelfConfirmation } from '@/lib/quiet-signals/types'
import { getSelfConfirmationPoints } from '@/lib/quiet-signals/scoring'

interface VoiceScreenProps {
  onContinue: (confirmation: SelfConfirmation | null, supportivePoints: number) => void
  onSkip: () => void
  onBack: () => void
}

type Phase = 'idle' | 'recording' | 'result'

const confirmationOptions: { key: SelfConfirmation; label: string }[] = [
  { key: 'yes', label: 'Yes, that feels accurate' },
  { key: 'somewhat', label: 'Somewhat' },
  { key: 'no', label: 'No, not really' },
  { key: 'unsure', label: "I'm not sure" },
]

// Animated waveform bars driven by audio levels
function WaveForm({ audioLevel }: { audioLevel: number }) {
  return (
    <div className="flex items-center gap-1 h-10" aria-hidden="true" role="presentation">
      {Array.from({ length: 20 }).map((_, i) => {
        // Create varied heights based on audio level and position
        const baseHeight = 6
        const variance = Math.sin(i * 0.8) * 0.5 + 0.5
        const height = baseHeight + audioLevel * variance * 28
        
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{ background: 'oklch(0.62 0.12 70)' }}
            animate={{
              height: [height * 0.8, height, height * 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.15,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

export default function VoiceScreen({ onContinue, onSkip, onBack }: VoiceScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [confirmation, setConfirmation] = useState<SelfConfirmation | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [micReady, setMicReady] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize microphone on mount
  useEffect(() => {
    let mounted = true
    
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        
        streamRef.current = stream
        
        // Set up audio analysis
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyserRef.current = analyser
        
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        
        setMicReady(true)
      } catch (err) {
        if (!mounted) return
        console.error('[v0] Microphone error:', err)
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setMicError('Microphone access was denied. Please allow microphone access in your browser settings.')
          } else if (err.name === 'NotFoundError') {
            setMicError('No microphone found on this device.')
          } else {
            setMicError('Unable to access microphone. Please check your permissions.')
          }
        }
      }
    }
    
    initMic()
    
    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Audio level monitoring during recording
  const startAudioMonitoring = useCallback(() => {
    if (!analyserRef.current) return
    
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const avg = sum / dataArray.length
      const normalizedLevel = Math.min(avg / 128, 1) // Normalize to 0-1
      
      setAudioLevel(normalizedLevel)
      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }
    
    updateLevel()
  }, [])

  const stopAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setAudioLevel(0)
  }, [])

  const startRecording = useCallback(() => {
    setPhase('recording')
    setRecordingTime(0)
    startAudioMonitoring()
    
    // Track recording time
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1
        // Auto-stop after 30 seconds
        if (newTime >= 30) {
          stopRecording()
        }
        return newTime
      })
    }, 1000)
  }, [startAudioMonitoring])

  const stopRecording = useCallback(() => {
    stopAudioMonitoring()
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setPhase('result')
  }, [stopAudioMonitoring])

  const handleContinue = () => {
    // Stop mic when continuing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    const pts = confirmation ? getSelfConfirmationPoints(confirmation) : 0
    onContinue(confirmation, pts)
  }

  const handleSkip = () => {
    // Stop mic when skipping
    stopAudioMonitoring()
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    onSkip()
  }

  const handleBack = () => {
    // Stop mic when going back
    stopAudioMonitoring()
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    onBack()
  }

  return (
    <main className="min-h-screen flex flex-col bg-background" role="main">
      <div className="px-6 pt-6 md:px-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-8 text-center"
        >
          <div className="space-y-3">
            <h1
              className="text-4xl md:text-5xl font-light text-foreground text-balance"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Voice reflection
            </h1>
            <div className="w-10 h-px bg-gold mx-auto" aria-hidden="true" />
          </div>

          <div className="p-5 rounded-2xl bg-card border border-warm-border space-y-2">
            <p
              className="text-xl font-light text-foreground"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              &ldquo;Describe one workplace moment recently that stayed with you.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can speak for 20 to 30 seconds. Quiet Signals will look for broad supportive cues such as pace, pauses, hesitation, and energy. This does not diagnose you.
            </p>
          </div>

          {/* Mic visualization */}
          <div className="flex flex-col items-center gap-6">
            {micError ? (
              <div className="flex flex-col items-center gap-3 p-4 text-center">
                <AlertCircle className="w-8 h-8 text-terracotta" aria-hidden="true" />
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{micError}</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {phase === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div 
                      className="w-24 h-24 rounded-full bg-secondary border-2 border-warm-border flex items-center justify-center"
                      aria-hidden="true"
                    >
                      {micReady ? (
                        <Mic className="w-10 h-10 text-muted-foreground" />
                      ) : (
                        <MicOff className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    {!micReady && (
                      <p className="text-xs text-muted-foreground">Starting microphone...</p>
                    )}
                  </motion.div>
                )}

                {phase === 'recording' && (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <motion.div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: 'oklch(0.62 0.12 70 / 0.12)', border: '2px solid oklch(0.62 0.12 70 / 0.4)' }}
                      animate={{ 
                        scale: [1, 1 + audioLevel * 0.1, 1], 
                        boxShadow: [
                          '0 0 0 0 oklch(0.62 0.12 70 / 0)', 
                          `0 0 0 ${8 + audioLevel * 16}px oklch(0.62 0.12 70 / ${0.02 + audioLevel * 0.08})`, 
                          '0 0 0 0 oklch(0.62 0.12 70 / 0)'
                        ] 
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      aria-hidden="true"
                    >
                      <Mic className="w-10 h-10" style={{ color: 'oklch(0.62 0.12 70)' }} />
                    </motion.div>
                    <WaveForm audioLevel={audioLevel} />
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-sm text-muted-foreground" aria-live="polite">Listening...</p>
                      <p className="text-xs text-muted-foreground/70">{recordingTime}s / 30s</p>
                    </div>
                    
                    {recordingTime >= 20 && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={stopRecording}
                        className="px-6 py-2 rounded-full text-sm font-medium border-2 border-gold text-foreground hover:bg-gold/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        Done speaking
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {phase === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0.62 0.12 70 / 0.1)', border: '2px solid oklch(0.62 0.12 70 / 0.3)' }}
                    aria-hidden="true"
                  >
                    <Mic className="w-10 h-10" style={{ color: 'oklch(0.62 0.12 70)' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Simulated result + confirmation */}
          <AnimatePresence>
            {phase === 'result' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div className="p-4 rounded-2xl bg-card border border-warm-border">
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;Your voice reflection suggests this topic may carry some pressure.&rdquo;
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Does this feel accurate right now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {confirmationOptions.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setConfirmation(key)}
                        className={`p-3 rounded-xl text-sm border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          confirmation === key
                            ? 'border-gold bg-gold/5 text-foreground'
                            : 'border-warm-border bg-card text-muted-foreground hover:border-gold/40'
                        }`}
                        aria-pressed={confirmation === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {confirmation && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleContinue}
                    className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                  >
                    Continue
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start / Skip buttons */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <button
                onClick={startRecording}
                disabled={!micReady && !micError}
                className="w-full py-4 rounded-full text-sm font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'oklch(0.62 0.12 70)', color: 'oklch(0.985 0.004 80)' }}
                aria-label="Start voice reflection recording"
              >
                {micReady ? 'Start voice reflection' : micError ? 'Microphone unavailable' : 'Starting microphone...'}
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-3 rounded-full text-sm text-muted-foreground hover:text-foreground border border-warm-border hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Skip voice reflection"
              >
                Skip voice reflection
              </button>
            </div>
          )}

          {phase === 'recording' && recordingTime < 20 && (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="Skip voice reflection"
            >
              Skip voice reflection
            </button>
          )}
        </motion.div>
      </section>
    </main>
  )
}
