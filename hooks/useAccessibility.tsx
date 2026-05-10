'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export interface AccessibilityPrefs {
  textOnly: boolean
  calm: boolean
  largerText: boolean
  highContrast: boolean
}

const DEFAULT_PREFS: AccessibilityPrefs = {
  textOnly: false,
  calm: false,
  largerText: false,
  highContrast: false,
}

const STORAGE_KEY = 'qs.a11y.v1'

type AccessibilityContextValue = AccessibilityPrefs & {
  setPref: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void
  togglePref: (key: keyof AccessibilityPrefs) => void
  systemReducedMotion: boolean
  effectiveCalm: boolean
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)

  // Load stored prefs
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>
        setPrefs((current) => ({ ...current, ...parsed }))
      }
    } catch {
      // ignore parse errors — fall back to defaults
    }
  }, [])

  // Persist on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // storage may be unavailable (private mode) — non-fatal
    }
  }, [prefs])

  // Watch prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  // Apply class names to <html> so any descendant CSS can read them
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('qs-larger', prefs.largerText)
    root.classList.toggle('qs-high-contrast', prefs.highContrast)
    root.classList.toggle('qs-calm', prefs.calm || systemReducedMotion)
    return () => {
      root.classList.remove('qs-larger', 'qs-high-contrast', 'qs-calm')
    }
  }, [prefs.largerText, prefs.highContrast, prefs.calm, systemReducedMotion])

  const setPref = useCallback<AccessibilityContextValue['setPref']>((key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }))
  }, [])

  const togglePref = useCallback<AccessibilityContextValue['togglePref']>((key) => {
    setPrefs((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...prefs,
      setPref,
      togglePref,
      systemReducedMotion,
      effectiveCalm: prefs.calm || systemReducedMotion,
    }),
    [prefs, setPref, togglePref, systemReducedMotion],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) {
    // Render-safe fallback so a missing provider never crashes the tree.
    return {
      ...DEFAULT_PREFS,
      setPref: () => {},
      togglePref: () => {},
      systemReducedMotion: false,
      effectiveCalm: false,
    }
  }
  return ctx
}
