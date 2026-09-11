import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi, { ServerStatusResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface ServerStatusRefreshResult {
  // True is the IAS server is available and the app can be used normally. If false, certain actions are blocked (e.g. verification flow, service login) and the outage banner is shown.
  isAvailable: boolean
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

const ServerStatusContext = createContext<ServerStatusContextType | null>(null)

const toResult = (serverStatus: ServerStatusResponseData | null): ServerStatusRefreshResult =>
  serverStatus
    ? {
        isAvailable: serverStatus.status === 'ok',
        statusMessage: serverStatus.statusMessage,
        contactLink: serverStatus.contactLink,
        serverStatus,
      }
    : { isAvailable: true, serverStatus: null }

// Fetches IAS server status and keeps outage banner in sync.
// `isAvailable` is used in other screens to gate access (verification flow, service login)
export const ServerStatusProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)

  const [serverStatus, setServerStatus] = useState<ServerStatusResponseData | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  // Wait for the request to finish before starting another
  const inFlightRef = useRef<Promise<ServerStatusRefreshResult> | null>(null)
  const fetchedForClientRef = useRef<BCSCApiClient | null>(null)
  const serverStatusRef = useRef(serverStatus)
  serverStatusRef.current = serverStatus

  const fetchStatus = useCallback(async (): Promise<ServerStatusRefreshResult> => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    const run = (async (): Promise<ServerStatusRefreshResult> => {
      setIsChecking(true)
      try {
        const status = await configApi.getServerStatus()
        setServerStatus(status)
        return toResult(status)
      } catch (error) {
        logger.error('ServerStatusProvider: failed to fetch server status', error as Error)
        return { isAvailable: true, serverStatus: null }
      } finally {
        setIsChecking(false)
        setHasChecked(true)
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = run
    return run
  }, [configApi, logger])

  const refresh = useCallback(
    async (options?: { force?: boolean }): Promise<ServerStatusRefreshResult> => {
      if (!options?.force) {
        return toResult(serverStatusRef.current)
      }
      if (!isClientReady || !client) {
        return toResult(serverStatusRef.current)
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
    setServerStatus(null)
    void fetchStatus()
  }, [isClientReady, client, fetchStatus])

  // Keep the outage and banner in sync with the latest known status
  useEffect(() => {
    if (!serverStatus) {
      return
    }

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
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.IAS_SERVER_NOTIFICATION,
            title: undefined,
            description: serverStatus.statusMessage,
            type: 'info',
            dismissible: false,
            metadata: { contactLink: serverStatus.contactLink },
          },
        ],
      })
    } else {
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.IAS_SERVER_NOTIFICATION] })
    }
  }, [serverStatus, dispatch, t])

  const value = useMemo<ServerStatusContextType>(
    () => ({ ...toResult(serverStatus), isChecking, hasChecked, refresh }),
    [serverStatus, isChecking, hasChecked, refresh]
  )

  return <ServerStatusContext.Provider value={value}>{children}</ServerStatusContext.Provider>
}

export const useServerStatus = (): ServerStatusContextType => useContext(ServerStatusContext) ?? defaultValue
