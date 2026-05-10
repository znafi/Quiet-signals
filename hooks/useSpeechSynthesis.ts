'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  /** When true, replaces any current speech instead of being ignored. */
  replace?: boolean
}

export interface SpeechSynthesisState {
  /** Whether the browser supports SpeechSynthesis at all. */
  supported: boolean
  /** True while text is actively being spoken. */
  isSpeaking: boolean
  /** True while the current utterance is paused. */
  isPaused: boolean
  /** Last text successfully queued. Useful for the Replay control. */
  lastSpokenText: string
  /** Voice currently being used (informational only). */
  selectedVoice: SpeechSynthesisVoice | null
}

/**
 * useSpeechSynthesis — small wrapper around window.speechSynthesis.
 *
 * Goals:
 *  - Never crash if the API is unavailable (returns supported=false).
 *  - Single-utterance model: speaking new text cancels the old one.
 *  - Picks a calm-sounding default voice when available.
 *  - Exposes pause/resume/stop/replay handles for the panel.
 */
export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  const lastTextRef = useRef('')
  const currentUtterRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Detect support + load voices (voices populate asynchronously).
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
      return
    }
    setSupported(true)
    const populate = () => {
      const list = window.speechSynthesis.getVoices()
      setVoices(list)
    }
    populate()
    window.speechSynthesis.addEventListener?.('voiceschanged', populate)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', populate)
    }
  }, [])

  // Pick a calm, English-language voice when available.
  useEffect(() => {
    if (!voices.length) return
    const preferred =
      voices.find((v) => /en[-_]?GB/i.test(v.lang) && /female|samantha|karen|moira|serena/i.test(v.name)) ||
      voices.find((v) => /en[-_]?US/i.test(v.lang) && /samantha|karen|joanna|aria/i.test(v.name)) ||
      voices.find((v) => v.default && v.lang?.startsWith('en')) ||
      voices.find((v) => v.lang?.startsWith('en')) ||
      voices[0]
    setSelectedVoice(preferred ?? null)
  }, [voices])

  // Cleanup on unmount — never leave speech running.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // non-fatal
        }
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (!supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      // non-fatal
    }
    currentUtterRef.current = null
    setIsSpeaking(false)
    setIsPaused(false)
  }, [supported])

  const speak = useCallback(
    (text: string, opts: SpeakOptions = {}) => {
      if (!supported) return
      const trimmed = text?.trim()
      if (!trimmed) return

      // Replace any in-flight speech.
      try {
        window.speechSynthesis.cancel()
      } catch {
        // non-fatal
      }

      const utter = new SpeechSynthesisUtterance(trimmed)
      utter.rate = opts.rate ?? 0.9
      utter.pitch = opts.pitch ?? 1
      utter.volume = opts.volume ?? 1
      if (selectedVoice) utter.voice = selectedVoice

      utter.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
      }
      utter.onend = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        currentUtterRef.current = null
      }
      utter.onerror = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        currentUtterRef.current = null
      }

      currentUtterRef.current = utter
      lastTextRef.current = trimmed
      try {
        window.speechSynthesis.speak(utter)
      } catch {
        // non-fatal — surface as not-speaking
        setIsSpeaking(false)
      }
    },
    [supported, selectedVoice],
  )

  const pause = useCallback(() => {
    if (!supported || !isSpeaking) return
    try {
      window.speechSynthesis.pause()
      setIsPaused(true)
    } catch {
      // non-fatal
    }
  }, [supported, isSpeaking])

  const resume = useCallback(() => {
    if (!supported) return
    try {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } catch {
      // non-fatal
    }
  }, [supported])

  const replay = useCallback(() => {
    if (!supported || !lastTextRef.current) return
    speak(lastTextRef.current)
  }, [supported, speak])

  const state: SpeechSynthesisState = {
    supported,
    isSpeaking,
    isPaused,
    lastSpokenText: lastTextRef.current,
    selectedVoice,
  }

  return { ...state, speak, pause, resume, stop, replay }
}
