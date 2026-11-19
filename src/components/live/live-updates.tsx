'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'

import {
  decidePoll,
  LIVE_INTERVAL_MS,
  type PauseReason,
  type PollOutcome,
  shouldPoll,
  toPollOutcome,
} from '@/lib/dashboard/live'

/** Starts a pause and returns its release. A second call of the release does nothing. */
type Pause = (reason: PauseReason) => () => void

const noop = () => {}

/** Outside the provider there are no live updates, so a pause does nothing. */
const PauseContext = createContext<Pause>(() => noop)

const VERSION_URL = '/api/content-items/version'

/** When the page does not render a new version after this time, the hook polls again. */
const REFRESH_TIMEOUT_MS = 10_000

type Props = {
  /** The version of the page on screen (LIVE-1). Each server render gives a new value. */
  version: string
  children: ReactNode
}

/**
 * LIVE-1, LIVE-2 (ADR 0008): asks the server for the version of the items and refreshes the
 * page when it is not the version on screen. All loop state is in refs: a tick does not render.
 */
export function LiveUpdates({ version, children }: Props) {
  const router = useRouter()
  const baseline = useRef(version)
  /** A refresh from this hook runs, and the page has not rendered a new version yet. */
  const refreshing = useRef(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pauses = useRef<Record<PauseReason, number>>({ dialog: 0, confirm: 0, drag: 0, move: 0 })

  const pause = useCallback<Pause>((reason) => {
    pauses.current[reason] += 1
    let released = false
    // LIVE-2: no poll at once after the last release. The next tick polls.
    return () => {
      if (released) return
      released = true
      pauses.current[reason] -= 1
    }
  }, [])

  // A new server render: its version is the new baseline, and the refresh is done.
  useEffect(() => {
    baseline.current = version
    refreshing.current = false
    if (refreshTimer.current !== null) clearTimeout(refreshTimer.current)
    refreshTimer.current = null
  }, [version])

  useEffect(() => {
    let disposed = false
    let inFlight = false
    /** Set after a 401. The next focus or visible event clears it. */
    let stopped = false
    let tickTimer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | null = null

    const isPaused = () => Object.values(pauses.current).some((count) => count > 0)

    function refresh() {
      refreshing.current = true
      if (refreshTimer.current !== null) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        refreshing.current = false
        refreshTimer.current = null
      }, REFRESH_TIMEOUT_MS)
      startTransition(() => router.refresh())
    }

    async function poll() {
      const state = {
        hidden: document.hidden,
        paused: isPaused(),
        inFlight,
        refreshing: refreshing.current,
        stopped,
      }
      if (!shouldPoll(state)) return
      inFlight = true
      controller = new AbortController()
      let outcome: PollOutcome
      try {
        const response = await fetch(VERSION_URL, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        })
        let body: unknown = null
        try {
          body = await response.json()
        } catch {
          // A body that is not JSON is an error (or a 401 with any body).
        }
        outcome = toPollOutcome(response.status, body)
      } catch {
        // A network error is silent. The next tick tries again.
        outcome = { kind: 'error' }
      } finally {
        inFlight = false
        controller = null
      }
      // LIVE-2: a pause that started during the request wins. The next tick polls again.
      if (disposed || isPaused()) return

      const decision = decidePoll(outcome, baseline.current)
      if (decision === 'none') return
      // ERR-5: after a 401, refresh once. The page then opens the login page.
      if (decision === 'stop') stopped = true
      refresh()
    }

    function schedule() {
      clearTimeout(tickTimer)
      tickTimer = setTimeout(() => {
        schedule()
        void poll()
      }, LIVE_INTERVAL_MS)
    }

    /** LIVE-1: poll at once on window focus and when the tab becomes visible. */
    function wake() {
      if (document.hidden) return
      stopped = false
      schedule()
      void poll()
    }

    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    schedule()

    return () => {
      disposed = true
      clearTimeout(tickTimer)
      controller?.abort()
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [router])

  // Clear the safety timer when the provider unmounts.
  useEffect(
    () => () => {
      if (refreshTimer.current !== null) clearTimeout(refreshTimer.current)
    },
    [],
  )

  return <PauseContext value={pause}>{children}</PauseContext>
}

/**
 * LIVE-2: returns `pause(reason)`. It pauses the live updates until the returned release is
 * called. The function has a stable identity, and a pause does not render.
 */
export function usePauseLive(): Pause {
  return useContext(PauseContext)
}
