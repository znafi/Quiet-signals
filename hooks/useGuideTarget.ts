'use client'

import { useEffect, useState } from 'react'

export type GuideSide = 'left' | 'right'

export interface GuidePosition {
  /** Vertical position (top, viewport coords) — same for both sides. */
  y: number
  /** X for the left edge anchor. */
  leftX: number
  /** X for the right edge anchor. */
  rightX: number
  /** Whether to fall back to mobile bottom-sheet placement instead. */
  bottomSheet: boolean
  /** The side the orb should default to (opposite of target's body). */
  autoSide: GuideSide
}

const ORB_WIDTH = 56
const ORB_HEIGHT = 56
const SIDE_MARGIN = 14 // distance from screen edge
const VERT_MARGIN = 16
const MOBILE_BREAKPOINT = 640

/**
 * useGuideTarget — compute side-anchored positions for the avatar.
 *
 * The avatar lives on the left or right *edge* of the viewport (never floating
 * over the target). It only adjusts its vertical position to follow the
 * target's mid-Y, and chooses a side that does not overlap the target.
 */
export function useGuideTarget(targetId: string | null): GuidePosition {
  const [position, setPosition] = useState<GuidePosition>({
    y: 80,
    leftX: SIDE_MARGIN,
    rightX: 0,
    bottomSheet: false,
    autoSide: 'right',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const compute = () => {
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const isMobile = viewportW < MOBILE_BREAKPOINT

      const leftX = SIDE_MARGIN
      const rightX = Math.max(SIDE_MARGIN, viewportW - ORB_WIDTH - SIDE_MARGIN)

      if (isMobile) {
        setPosition({
          y: Math.max(VERT_MARGIN, viewportH - ORB_HEIGHT - VERT_MARGIN),
          leftX: SIDE_MARGIN,
          rightX,
          bottomSheet: true,
          autoSide: 'right',
        })
        return
      }

      const target = targetId
        ? document.querySelector<HTMLElement>(`[data-guide-target="${targetId}"]`)
        : null

      // Fallback: middle-right of the screen if no target.
      if (!target) {
        const fallbackY = Math.max(VERT_MARGIN, Math.min(viewportH - ORB_HEIGHT - VERT_MARGIN, viewportH * 0.55))
        setPosition({
          y: fallbackY,
          leftX,
          rightX,
          bottomSheet: false,
          autoSide: 'right',
        })
        return
      }

      const rect = target.getBoundingClientRect()
      // Vertical: align with the target's mid-Y, clamped to viewport.
      let y = rect.top + rect.height / 2 - ORB_HEIGHT / 2
      y = Math.max(VERT_MARGIN, Math.min(viewportH - ORB_HEIGHT - VERT_MARGIN, y))

      // Default side: opposite of where the target's center sits.
      const targetCenterX = rect.left + rect.width / 2
      const autoSide: GuideSide = targetCenterX > viewportW / 2 ? 'left' : 'right'

      setPosition({ y, leftX, rightX, bottomSheet: false, autoSide })
    }

    compute()

    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(compute)
    }

    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    const settle = window.setTimeout(compute, 350)

    return () => {
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      cancelAnimationFrame(raf)
      window.clearTimeout(settle)
    }
  }, [targetId])

  return position
}
