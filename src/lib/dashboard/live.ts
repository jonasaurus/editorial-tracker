/** LIVE-1: the poll interval. */
export const LIVE_INTERVAL_MS = 5000

/** LIVE-2: why the live updates pause. Each reason counts: two pending moves need two releases. */
export type PauseReason = 'dialog' | 'confirm' | 'drag' | 'move'

/**
 * LIVE-1: the version text of the items a user can read. Today first (DL-1: the deadline states
 * change at midnight), then the count, then the latest `updatedAt` ('-' when there is no item).
 * Two equal texts mean: nothing to refresh.
 */
export function formatVersion(
  today: string,
  count: number,
  latestUpdatedAt: string | null,
): string {
  return `${today}:${count}:${latestUpdatedAt ?? '-'}`
}

/** The result of one poll of the version endpoint. */
export type PollOutcome =
  { kind: 'version'; version: string } | { kind: 'unauthorized' } | { kind: 'error' }

/**
 * Reads the version endpoint response. 200 with `{ version: string }` (not empty) → version.
 * 401 (any body) → unauthorized. Anything else (other status, bad body) → error.
 */
export function toPollOutcome(status: number, body: unknown): PollOutcome {
  if (status === 401) return { kind: 'unauthorized' }
  if (status !== 200) return { kind: 'error' }
  if (typeof body !== 'object' || body === null || !('version' in body)) return { kind: 'error' }
  const { version } = body
  if (typeof version !== 'string' || version === '') return { kind: 'error' }
  return { kind: 'version', version }
}

/** The state of the live hook before a poll. */
export type PollState = {
  /** The tab is hidden (LIVE-2). */
  hidden: boolean
  /** One or more pause reasons are active (LIVE-2). */
  paused: boolean
  /** A version request runs. */
  inFlight: boolean
  /** A refresh from the hook runs and the page has not rendered a new version yet. */
  refreshing: boolean
  /** Stopped after a 401 until the next focus or visible event. */
  stopped: boolean
}

/** True when the hook may send a version request now: no flag in the state is true. */
export function shouldPoll(state: PollState): boolean {
  return !(state.hidden || state.paused || state.inFlight || state.refreshing || state.stopped)
}

/**
 * What to do with a poll outcome. A version not equal to the baseline (the version of the
 * page on screen) → refresh. Unauthorized → refresh once and stop (the page sends the user
 * to the login page, ERR-5). Equal version or error → nothing.
 */
export function decidePoll(outcome: PollOutcome, baseline: string): 'refresh' | 'stop' | 'none' {
  switch (outcome.kind) {
    case 'version':
      return outcome.version === baseline ? 'none' : 'refresh'
    case 'unauthorized':
      return 'stop'
    case 'error':
      return 'none'
  }
}
