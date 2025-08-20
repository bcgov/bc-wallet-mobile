import { useCallback, useMemo } from 'react'
import { useStore } from '@bifold/core'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { createPreVerificationJWT } from 'react-native-bcsc-core'
import { BCState } from '@/store'

type SessionStatusType = 'session_granted' | 'session_not_granted' | 'session_failed' | 'session_ended'
type CallStatusType =
  | 'call_ringing'
  | 'call_media_pending'
  | 'call_in_call'
  | 'call_ended'
  | 'call_error'
  | 'call_dropped'
  | 'call_reconnected'

export interface VideoSession {
  client_id: string
  gateway_uri: string
  session_id: string
  session_token: string
  destination: string
  device_code: string
  status: SessionStatusType
  status_date: number // seconds from epoch
  created_date: number // seconds from epoch
}

export interface VideoCall {
  session_id: string
  call_id: string
  status: CallStatusType
  status_date: number // seconds from epoch
}

export interface VideoDestination {
  destinationId: number
  videoDestinationConfigId: number
  destinationName: string
  destinationAddress: string
  maxActiveSessions: number
  maxInactiveSeconds: number
  destinationPriority: number
  numberOfAgents: number
  effectiveStartDate: number
  videoDestinationConfig: {
    videoDestinationConfigId: number
    videoClientId: string
    videoGatewayUrl: string
    videoDestTruststore: string
    truststorePassword: string
    videoClientKeystore: string
    keystorePassword: string
    clientCertAlias: string
    effectiveStartDate: number
    effectiveEndDate: number | null
  }
}

export type VideoDestinations = VideoDestination[]

export interface ServicePeriod {
  start_day: string // e.g. "MONDAY"
  end_day: string   // e.g. "MONDAY"
  start_time: string // e.g. "05:00"
  end_time: string    // e.g. "23:59"
}

export interface ServiceHours {
  time_zone: string
  regular_service_periods: ServicePeriod[]
  service_unavailable_periods: ServicePeriod[]
}

const useVideoCallApi = () => {
  const [store] = useStore<BCState>()

  const _getDeviceCode = useCallback(() => {
    const code = store.bcsc.deviceCode
    if (!code) throw new Error('Device code is missing. Re install the app and try again.')
    return code
  }, [store.bcsc.deviceCode])

  const createVideoSession = useCallback(
    async (): Promise<VideoSession> => {
      return withAccount(async (account) => {
        const deviceCode = _getDeviceCode()
        const body = { client_id: account.clientID, device_code: deviceCode }
        const token = await createPreVerificationJWT(deviceCode, account.clientID)
        const { data } = await apiClient.post<VideoSession>(
          `${apiClient.endpoints.video}/v1/sessions/`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    []
  )

  const updateVideoSessionStatus = useCallback(
    async (sessionId: string, status: SessionStatusType): Promise<VideoSession> => {
      return withAccount(async (account) => {
        const body = { status }
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<VideoSession>(
          `${apiClient.endpoints.video}/v1/sessions/${sessionId}`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode]
  )

  const createVideoCall = useCallback(
    async (sessionId: string): Promise<VideoCall> => {
      return withAccount(async (account) => {
        const body = { session_id: sessionId }
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.post<VideoCall>(
          `${apiClient.endpoints.video}/v1/sessions/${sessionId}/calls/`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode]
  )

  const updateVideoCallStatus = useCallback(
    async (sessionId: string, callId: string, status: CallStatusType, clientCallId?: string): Promise<VideoCall> => {
      return withAccount(async (account) => {
        const body = { status, ...(clientCallId && { client_call_id: clientCallId }) }
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.put<VideoCall>(
          `${apiClient.endpoints.video}/v1/sessions/${sessionId}/calls/${callId}`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode]
  )

  const endVideoSession = useCallback(
    async (sessionId: string): Promise<void> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        await apiClient.delete(
          `${apiClient.endpoints.video}/v1/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
      })
    },
    [_getDeviceCode]
  )

  const getVideoDestinations = useCallback(
    async (): Promise<VideoDestinations> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.get<VideoDestinations>(
          `${apiClient.endpoints.video}/v1/destinations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode]
  )

  const getServiceHours = useCallback(
    async (): Promise<ServiceHours> => {
      return withAccount(async (account) => {
        const token = await createPreVerificationJWT(_getDeviceCode(), account.clientID)
        const { data } = await apiClient.get<ServiceHours>(
          `${apiClient.endpoints.video}/video/v1/service_hours`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            skipBearerAuth: true,
          }
        )
        return data
      })
    },
    [_getDeviceCode]
  )

  return useMemo(
    () => ({
      createVideoSession,
      updateVideoSessionStatus,
      createVideoCall,
      updateVideoCallStatus,
      endVideoSession,
      getVideoDestinations,
      getServiceHours,
    }),
    [
      createVideoSession,
      updateVideoSessionStatus,
      createVideoCall,
      updateVideoCallStatus,
      endVideoSession,
      getVideoDestinations,
      getServiceHours,
    ]
  )
}

export default useVideoCallApi
