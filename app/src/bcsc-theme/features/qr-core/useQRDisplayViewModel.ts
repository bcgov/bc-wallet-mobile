import { BifoldAgent, BifoldLogger, createConnectionInvitation } from '@bifold/core'
import { useCallback, useEffect, useState } from 'react'
import { Share } from 'react-native'

export type QRDisplayStatus = 'loading' | 'ready' | 'error'

export interface QRDisplayViewModelInputs {
  agent: BifoldAgent | null
  logger: BifoldLogger
}

export interface QRDisplayViewModel {
  invitation: string | undefined
  status: QRDisplayStatus
  error: Error | null
  retry: () => void
  share: () => Promise<void>
}

const useQRDisplayViewModel = ({ agent, logger }: QRDisplayViewModelInputs): QRDisplayViewModel => {
  const [invitation, setInvitation] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<QRDisplayStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!agent) {
      return
    }

    let cancelled = false
    setStatus('loading')
    setError(null)

    createConnectionInvitation(agent)
      .then((result) => {
        if (cancelled) {
          return
        }
        setInvitation(result.invitationUrl)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        const wrapped = err instanceof Error ? err : new Error(String(err))
        logger.error('[QRDisplay] createConnectionInvitation failed', wrapped)
        setError(wrapped)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [agent, retryToken, logger])

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
      logger.error('[QRDisplay] Share failed', err instanceof Error ? err : new Error(String(err)))
    }
  }, [invitation, logger])

  return { invitation, status, error, retry, share }
}

export default useQRDisplayViewModel
