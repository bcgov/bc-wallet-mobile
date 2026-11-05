import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi, { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)

  const [serverStatusState, setServerStatusState] = useState<ServerStatusState>({ kind: 'unknown' })
  const [isChecking, setIsChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  // Wait for the request to finish before starting another
  const inFlightRef = useRef<Promise<ServerStatusRefreshResult> | null>(null)
  const fetchedForClientRef = useRef<BCSCApiClient | null>(null)
  const serverStatusStateRef = useRef(serverStatusState)
  serverStatusStateRef.current = serverStatusState

  const fetchStatus = useCallback(async (): Promise<ServerStatusRefreshResult> => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const run = (async (): Promise<ServerStatusRefreshResult> => {
      setIsChecking(true)
      let newState: ServerStatusState = { kind: 'unknown' }
      try {
        const status = await configApi.getServerStatus()
        newState = { kind: 'loaded', data: status }
      } catch (error) {
        logger.error('ServerStatusProvider: failed to fetch server status', error as Error)
        newState = { kind: 'error' }
      } finally {
        setIsChecking(false)
        setHasChecked(true)
        inFlightRef.current = null
      }

      setServerStatusState(newState)
      return toResult(newState)
    })()

    inFlightRef.current = run
    return run
  }, [configApi, logger])

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
      if (nextAppState === 'active') {
        void fetchStatus()
      }
    })

    return () => subscription.remove()
  }, [isClientReady, client, fetchStatus])

  // Keep the outage and banner in sync with the latest known status
  // TODO (MD): These banner messages and all banner messages should be derived from `facts` in the store (on the fly) instead of being dispatched.
  useEffect(() => {
    if (serverStatusState.kind === 'unknown') {
      return
    }

    if (serverStatusState.kind === 'error') {
      return
    }

    const serverStatus = serverStatusState.data

    if (serverStatus.status !== 'ok') {
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_NOTIFICATION] })
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
            title: undefined,
            description: serverStatus.statusMessage ?? t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'),
            type: 'info',
            dismissible: false,
            metadata: { contactLink: serverStatus.contactLink },
          },
        ],
      })
      return
    }

    dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_UNAVAILABLE] })

    if (serverStatus.statusMessage) {
      // A fixed one-line summary: the message itself can run long enough to fill the screen, so it
      // is shown on the ServiceNotice screen the banner opens instead.
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.IAS_SERVER_NOTIFICATION,
            title: t('BCSC.SystemChecks.ServerStatus.NoticeBannerTitle'),
            type: 'warning',
            dismissible: false,
          },
        ],
      })
    } else {
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_NOTIFICATION] })
    }
  }, [serverStatusState, dispatch, t])

  const value = useMemo<ServerStatusContextType>(
    () => ({ ...toResult(serverStatusState), isChecking, hasChecked, refresh }),
    [serverStatusState, isChecking, hasChecked, refresh]
  )

  return <ServerStatusContext.Provider value={value}>{children}</ServerStatusContext.Provider>
}

export const useServerStatus = (): ServerStatusContextType => useContext(ServerStatusContext)
