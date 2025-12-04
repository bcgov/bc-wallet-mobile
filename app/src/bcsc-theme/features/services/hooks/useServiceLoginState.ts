import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useDeepLinkViewModel } from '@/contexts/DeepLinkViewModelContext'
import { useEffect, useReducer, useRef } from 'react'

export type LocalState = {
  serviceTitle?: string
  pairingCode?: string
  authenticationUrl?: string
  claimsDescription?: string
  privacyPolicyUri?: string
  serviceInitiateLoginUri?: string
  service?: ClientMetadata
  serviceClientUri?: string
}

type MergeFunction = (current: LocalState, next: Partial<LocalState>) => LocalState

type Logger = {
  info: (message: string) => void
  error: (message: string, error?: Error) => void
}

type MetadataApi = {
  getClientMetadata: () => Promise<ClientMetadata[]>
}

type UseServiceLoginStateArgs = {
  serviceClientId?: string
  serviceTitle?: string
  pairingCode?: string
  metadata: MetadataApi
  logger: Logger
}

export type UseServiceLoginStateResult = {
  state: LocalState
  isLoading: boolean
  serviceHydrated: boolean
}

const merge: MergeFunction = (current, next) => ({ ...current, ...next })

const initialState: LocalState = {
  authenticationUrl: undefined,
  serviceTitle: undefined,
  claimsDescription: undefined,
  privacyPolicyUri: undefined,
  pairingCode: undefined,
  service: undefined,
  serviceInitiateLoginUri: undefined,
  serviceClientUri: undefined,
}

export const useServiceLoginState = ({
  serviceClientId,
  serviceTitle: initialServiceTitle,
  pairingCode: initialPairingCode,
  metadata,
  logger,
}: UseServiceLoginStateArgs): UseServiceLoginStateResult => {
  const viewModel = useDeepLinkViewModel()
  const [state, dispatch] = useReducer(merge, {
    ...initialState,
    serviceTitle: initialServiceTitle,
    pairingCode: initialPairingCode,
  })
  const pendingConsumedRef = useRef(false)

  const {
    data: serviceClients,
    load,
    isLoading,
  } = useDataLoader<ClientMetadata[]>(() => metadata.getClientMetadata(), {
    onError: (error) => {
      logger.error('ServiceLoginScreen: Error loading services', error as Error)
    },
  })

  useEffect(() => {
    logger.info('ServiceLoginScreen: Loading metadata')
    load()
  }, [load, logger])

  useEffect(() => {
    logger.info(
      `ServiceLoginScreen: Service lookup - isLoading: ${isLoading}, serviceTitle: ${
        state.serviceTitle
      }, serviceClientId: ${serviceClientId}, serviceClients count: ${serviceClients?.length ?? 0}`
    )

    if (isLoading || (!state.serviceTitle && !serviceClientId)) {
      return
    }

    const client = serviceClients?.find((service) => {
      if (serviceClientId) {
        logger.info(`ServiceLoginScreen: Searching for service by ID: ${serviceClientId}`)
        return service.client_ref_id === serviceClientId
      }
      if (state.serviceTitle) {
        logger.info(`ServiceLoginScreen: Searching for service by title: ${state.serviceTitle}`)
        return service.client_name.toLowerCase().includes(state.serviceTitle.toLowerCase())
      }
      return false
    })

    if (!client) {
      logger.info(`ServiceLoginScreen: No matching service found`)
      return
    }

    logger.info(`ServiceLoginScreen: Found service client for ${client.client_name}`)

    dispatch({
      serviceTitle: client.client_name,
      claimsDescription: client.claims_description,
      privacyPolicyUri: client.policy_uri,
      serviceInitiateLoginUri: client.initiate_login_uri,
      serviceClientUri: client.client_uri,
      service: client,
    })
  }, [isLoading, logger, serviceClientId, serviceClients, state.serviceTitle])

  useEffect(() => {
    logger.info(
      `ServiceLoginScreen: Pending deep link check - serviceClientId: ${serviceClientId}, pendingConsumedRef: ${
        pendingConsumedRef.current
      }, hasLoginData: ${Boolean(
        state.authenticationUrl || state.pairingCode || state.serviceTitle
      )}, hasPendingDeepLink: ${viewModel.hasPendingDeepLink}`
    )

    if (serviceClientId) {
      return
    }

    if (pendingConsumedRef.current) {
      return
    }

    const hasLoginData = Boolean(state.authenticationUrl || state.pairingCode || state.serviceTitle)
    if (hasLoginData) {
      return
    }

    if (!viewModel.hasPendingDeepLink) {
      return
    }

    const pending = viewModel.consumePendingDeepLink()
    if (!pending) {
      return
    }

    pendingConsumedRef.current = true
    logger.info(`ServiceLoginScreen: Consuming pending deep link for ${pending.serviceTitle}`)

    dispatch({
      serviceTitle: pending.serviceTitle,
      pairingCode: pending.pairingCode,
    })
  }, [serviceClientId, state.authenticationUrl, logger, state.pairingCode, state.serviceTitle, viewModel])

  return {
    state,
    isLoading,
    serviceHydrated: Boolean(state.service),
  }
}
