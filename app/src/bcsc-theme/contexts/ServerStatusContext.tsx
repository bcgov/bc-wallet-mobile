import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi, { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { TOKENS, useServices } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

type ServerStatusState =
  | { kind: 'unknown' } // fresh mount
  | { kind: 'error' } // last fetch failed
  | { kind: 'loaded'; data: ServerStatusResponseData }

export interface ServerStatusRefreshResult {
  /**
   * True is the IAS server is available and the app can be used normally.
   * If false, certain actions are blocked (e.g. verification flow, service login) and the outage banner is shown.
   * Null indicates the status is unknown (e.g. first fetch failed, or the API client is not ready yet).
   */
  isAvailable: boolean | null
  statusMessage?: string
  contactLink?: string
  // Raw server status from the API
  serverStatus: ServerStatusResponseData | null
}

export interface ServerStatusContextType extends ServerStatusRefreshResult {
  isChecking: boolean
  // True once the first status fetch has completed
  hasChecked: boolean
  //Returns the cached value, adding `{ force: true }` to force an API call
  refresh: (options?: { force?: boolean }) => Promise<ServerStatusRefreshResult>
}

// Fail-open default so screens/hooks used outside the provider do not block
const defaultValue: ServerStatusContextType = {
  isAvailable: true,
  statusMessage: undefined,
  contactLink: undefined,
  serverStatus: null,
  isChecking: false,
  hasChecked: true,
  refresh: async () => ({ isAvailable: true, serverStatus: null }),
}

const ServerStatusContext = createContext<ServerStatusContextType>(defaultValue)

const toResult = (serverStatus: ServerStatusState): ServerStatusRefreshResult => {
  if (serverStatus.kind === 'error') {
    // On error, return null to indicate the status is unknown
    return { isAvailable: null, serverStatus: null }
  }

  if (serverStatus.kind === 'loaded') {
    // If the server status is loaded, we return the actual status and any relevant information.
    return {
      isAvailable: serverStatus.data.status === 'ok',
      statusMessage: serverStatus.data.statusMessage,
      contactLink: serverStatus.data.contactLink,
      serverStatus: serverStatus.data,
    }
  }

  // Optimistic default (unknown): Assume the server is available until we know otherwise.
  return { isAvailable: true, serverStatus: null }
}

// Fetches IAS server status and keeps outage banner in sync.
// `isAvailable` is used in other screens to gate access (verification flow, service login)
export const ServerStatusProvider = ({ children }: PropsWithChildren) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)

  const [serverStatusState, setServerStatusState] = useState<ServerStatusState>({ kind: 'unknown' })
  const [isChecking, setIsChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  // Wait for the request to finish before starting another
  const inFlightRef = useRef<Promise<ServerStatusRefreshResult> | null>(null)
  // Bumped when the app goes to the background: a fetch started before then may bring back a stale Date header
  const generationRef = useRef(0)
  const fetchedForClientRef = useRef<BCSCApiClient | null>(null)
  const serverStatusStateRef = useRef(serverStatusState)
  serverStatusStateRef.current = serverStatusState

  const fetchStatus = useCallback(async (): Promise<ServerStatusRefreshResult> => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const generation = generationRef.current
    const run = (async (): Promise<ServerStatusRefreshResult> => {
      setIsChecking(true)
      let newState: ServerStatusState = { kind: 'unknown' }
      try {
        const status = await configApi.getServerStatus()
        newState = { kind: 'loaded', data: status }
      } catch (error) {
        logger.error('ServerStatusProvider: failed to fetch server status', error as Error)
        newState = { kind: 'error' }
      }

      // Started before the app went to the background; the fetch on return replaces it
      if (generation !== generationRef.current) {
        return toResult(newState)
      }

      // The status call is also the clock check: the client refuses token requests while the clock is off
      client?.recordServerTime(newState.kind === 'loaded' ? newState.data.serverTimestamp : undefined)
      setIsChecking(false)
      setHasChecked(true)
      inFlightRef.current = null

      // A failed check during an outage keeps the last known outage
      const previous = serverStatusStateRef.current
      if (newState.kind === 'error' && previous.kind === 'loaded' && previous.data.status !== 'ok') {
        newState = previous
      }

      setServerStatusState(newState)
      return toResult(newState)
    })()

    inFlightRef.current = run
    return run
  }, [client, configApi, logger])

  const refresh = useCallback(
    async (options?: { force?: boolean }): Promise<ServerStatusRefreshResult> => {
      if (!options?.force) {
        return toResult(serverStatusStateRef.current)
      }
      if (!isClientReady || !client) {
        return toResult(serverStatusStateRef.current)
      }
      return fetchStatus()
    },
    [isClientReady, client, fetchStatus]
  )

  // Fetch once the client is ready
  useEffect(() => {
    if (!isClientReady || !client) {
      return
    }
    if (fetchedForClientRef.current === client) {
      return
    }
    fetchedForClientRef.current = client
    setServerStatusState({ kind: 'unknown' })
    void fetchStatus()
  }, [isClientReady, client, fetchStatus])

  // Check server status when app becomes active
  useEffect(() => {
    if (!isClientReady || !client) {
      return
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // The user may change the clock while away, so drop the reading and any fetch still in flight
        generationRef.current += 1
        inFlightRef.current = null
        client.recordServerTime()
      } else if (nextAppState === 'active') {
        void fetchStatus()
      }
    })

    return () => subscription.remove()
  }, [isClientReady, client, fetchStatus])

  // A token request with no clock reading runs this fetch first
  useEffect(() => {
    if (!isClientReady || !client) {
      return
    }

    client.setClockCheck(fetchStatus)
    return () => client.setClockCheck(undefined)
  }, [isClientReady, client, fetchStatus])

  const value = useMemo<ServerStatusContextType>(
    () => ({ ...toResult(serverStatusState), isChecking, hasChecked, refresh }),
    [serverStatusState, isChecking, hasChecked, refresh]
  )

  return <ServerStatusContext.Provider value={value}>{children}</ServerStatusContext.Provider>
}

export const useServerStatus = (): ServerStatusContextType => useContext(ServerStatusContext)
