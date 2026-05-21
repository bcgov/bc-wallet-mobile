import { BifoldAgent, BifoldLogger, createConnectionInvitation, useConnectionByOutOfBandId } from '@bifold/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Share } from 'react-native'

export enum QRDisplayStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
}

export interface QRDisplayViewModelInputs {
  agent: BifoldAgent | null
  logger: BifoldLogger
  /**
   * Fired once when the displayed invitation results in a connection. The
   * argument is the new connection's id so the caller can navigate to chat.
   */
  onConnectionAccepted?: (connectionId: string) => void
}

export interface QRDisplayViewModel {
  invitation: string | undefined
  status: QRDisplayStatus
  error: Error | null
  retry: () => void
  share: () => Promise<void>
}

const toError = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)))

const useQRDisplayViewModel = ({
  agent,
  logger,
  onConnectionAccepted,
}: QRDisplayViewModelInputs): QRDisplayViewModel => {
  const [invitation, setInvitation] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<QRDisplayStatus>(QRDisplayStatus.LOADING)
  const [error, setError] = useState<Error | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [oobRecordId, setOobRecordId] = useState<string | undefined>(undefined)
  // Guard against firing twice if the connection record updates after creation.
  const acceptedRef = useRef(false)

  // Latest callback in a ref so we don't restart the watcher each render.
  const onAcceptedRef = useRef<typeof onConnectionAccepted>(undefined)
  useEffect(() => {
    onAcceptedRef.current = onConnectionAccepted
  }, [onConnectionAccepted])

  useEffect(() => {
    if (!agent) {
      setInvitation(undefined)
      setOobRecordId(undefined)
      acceptedRef.current = false
      setError(null)
      setStatus(QRDisplayStatus.LOADING)
      return
    }

    let cancelled = false
    setStatus(QRDisplayStatus.LOADING)
    setError(null)

    createConnectionInvitation(agent)
      .then((result) => {
        if (cancelled) {
          return
        }
        acceptedRef.current = false
        setOobRecordId(result.record.id)
        setInvitation(result.invitationUrl)
        setStatus(QRDisplayStatus.READY)
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        const wrapped = toError(err)
        logger.error('[QRDisplay] createConnectionInvitation failed', wrapped)
        setError(wrapped)
        setStatus(QRDisplayStatus.ERROR)
      })

    return () => {
      cancelled = true
    }
  }, [agent, retryToken, logger])

  const connection = useConnectionByOutOfBandId(oobRecordId ?? '')

  useEffect(() => {
    if (!oobRecordId || !connection || acceptedRef.current) {
      return
    }
    acceptedRef.current = true
    onAcceptedRef.current?.(connection.id)
  }, [oobRecordId, connection])

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1)
  }, [])

  const share = useCallback(async () => {
    if (!invitation) {
      return
    }
    logger.info('[QRDisplay] Sharing invitation')
    try {
      await Share.share({ message: invitation })
    } catch (err) {
      logger.error('[QRDisplay] Share failed', toError(err))
    }
  }, [invitation, logger])

  return { invitation, status, error, retry, share }
}

export default useQRDisplayViewModel
