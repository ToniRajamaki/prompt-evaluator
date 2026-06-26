import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Smooths bursty streamed text into a steady typewriter reveal.
 *
 * Deltas pushed via `push` accumulate into a target string; the `displayed`
 * string advances toward that target a few characters per animation frame, so
 * uneven network chunks render as a fluid stream. Large backlogs are revealed
 * faster so the display never lags far behind the model.
 */
export function useStreamingText(minCharsPerFrame = 2) {
  const targetRef = useRef('')
  const displayedRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const [displayed, setDisplayed] = useState('')
  const [caughtUp, setCaughtUp] = useState(true)

  const tick = useCallback(() => {
    const target = targetRef.current
    const current = displayedRef.current
    if (current.length < target.length) {
      const backlog = target.length - current.length
      const step = Math.max(minCharsPerFrame, Math.ceil(backlog / 8))
      const next = target.slice(0, current.length + step)
      displayedRef.current = next
      setDisplayed(next)
      setCaughtUp(next.length === target.length)
      rafRef.current = requestAnimationFrame(tick)
    } else {
      rafRef.current = null
      setCaughtUp(true)
    }
  }, [minCharsPerFrame])

  const push = useCallback(
    (delta: string) => {
      targetRef.current += delta
      setCaughtUp(false)
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick)
      }
    },
    [tick],
  )

  const reset = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    targetRef.current = ''
    displayedRef.current = ''
    setDisplayed('')
    setCaughtUp(true)
  }, [])

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return { displayed, push, reset, caughtUp }
}
