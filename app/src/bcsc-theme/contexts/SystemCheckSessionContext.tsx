import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type RunStatus = 'running' | 'settled'

/** A record of runs by key. Each run is claimed once and finished once. */
export interface RunRegistry {
  /** The status of the run for `key`, or undefined until it has been started. */
  getRunStatus: (key: string) => RunStatus | undefined
  /**
   * Claims the run for `key`. Returns the function that marks it finished, or undefined when the run has
   * already been started, so a batch is never started twice. The claim is recorded synchronously: two
   * callers in one commit can't both start it.
   */
  startRun: (key: string) => (() => void) | undefined
}

export interface ResettableRunRegistry extends RunRegistry {
  /** Forgets every run. A run started before the reset finishes into the void. */
  reset: () => void
}

/**
 * A run registry held in React state, so a consumer re-renders when a run it reads changes status.
 *
 * @returns The registry, with a reset.
 */
export const useRunRegistry = (): ResettableRunRegistry => {
  // Claims are checked synchronously, before the state update lands
  const claimsRef = useRef(new Set<string>())
  const generationRef = useRef(0)
  const [runs, setRuns] = useState<ReadonlyMap<string, RunStatus>>(() => new Map())

  const getRunStatus = useCallback((key: string) => runs.get(key), [runs])

  const startRun = useCallback((key: string) => {
    if (claimsRef.current.has(key)) {
      return undefined
    }

    claimsRef.current.add(key)
    const generation = generationRef.current
    setRuns((current) => new Map(current).set(key, 'running'))

    return () => {
      // A finish from before a reset must not settle a run of the registry's next life
      if (generationRef.current === generation) {
        setRuns((current) => new Map(current).set(key, 'settled'))
      }
    }
  }, [])

  const reset = useCallback(() => {
    generationRef.current += 1
    claimsRef.current.clear()
    setRuns(new Map())
  }, [])

  return useMemo(() => ({ getRunStatus, startRun, reset }), [getRunStatus, startRun, reset])
}

export const SystemCheckSessionContext = createContext<RunRegistry | null>(null)

interface SystemCheckSessionProviderProps extends PropsWithChildren {
  /**
   * False outside a signed-in session (locked, no account, recovering a session): the record is cleared, so
   * the next session runs its checks again. Defaults to true.
   */
  enabled?: boolean
}

/**
 * Remembers which system check batches have run in the current signed-in session, for the scopes that run
 * once per session rather than once per mounting navigator (the scopes with a `sessionKey` in
 * `useCreateSystemChecks`). Mounted above the root's route, so the record outlives the navigators that swap
 * beneath it: a stack that mounts again mid-session finds its batch settled and renders without waiting on it.
 *
 * @param props - The children, and whether a session is active (see {@link SystemCheckSessionProviderProps}).
 * @returns The provider wrapping its children.
 */
export const SystemCheckSessionProvider = ({ enabled = true, children }: SystemCheckSessionProviderProps) => {
  const { getRunStatus, startRun, reset } = useRunRegistry()

  useEffect(() => {
    if (!enabled) {
      reset()
    }
  }, [enabled, reset])

  const registry = useMemo(() => ({ getRunStatus, startRun }), [getRunStatus, startRun])

  return <SystemCheckSessionContext.Provider value={registry}>{children}</SystemCheckSessionContext.Provider>
}

/**
 * The session's run registry, or null when rendered outside a {@link SystemCheckSessionProvider}. The scopes
 * that run once per mount don't need one.
 *
 * @returns The registry or null.
 */
export const useSystemCheckSession = () => useContext(SystemCheckSessionContext)
