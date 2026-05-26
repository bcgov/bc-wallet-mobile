import { BifoldAgent, BifoldLogger, useConnectionByOutOfBandId } from '@bifold/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Share } from 'react-native'

export enum QRDisplayStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
}

// Mirror of bifold's internal `constants.ts#domain`; it's not exported from
// @bifold/core so we redeclare it here. Both this app and bifold use the
// `didcomm://invite` scheme for OOB URLs.
const OOB_INVITE_DOMAIN = 'didcomm://invite'

export interface QRDisplayViewModelInputs {
  agent: BifoldAgent | null
  logger: BifoldLogger
  /**
   * Becomes the OOB invitation's `label`, which credo-ts copies into the
   * scanner's `theirLabel` on their new connection record (see
   * `DidExchangeProtocol.createRequest`). Without it the scanner has no
   * name for us and falls back to displaying the connection's UUID.
   */
  label?: string
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
  label,
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

    // Call credo's oob.createInvitation directly rather than going through
    // bifold's `createConnectionInvitation` helper because that helper
    // doesn't forward a `label`. Credo embeds this label in the OOB
    // invitation, and the scanner reads it as `theirLabel` on the new
    // connection record (which is what the chat header displays).
    ;(async () => {
      try {
        const record = await agent.modules.didcomm.oob.createInvitation({ label })
        if (cancelled) {
          return
        }
        const invitationUrl = record.outOfBandInvitation.toUrl({ domain: OOB_INVITE_DOMAIN })
        acceptedRef.current = false
        setOobRecordId(record.id)
        setInvitation(invitationUrl)
        setStatus(QRDisplayStatus.READY)
      } catch (err) {
        if (cancelled) {
          return
        }
        const wrapped = toError(err)
        logger.error('[QRDisplay] createInvitation failed', wrapped)
        setError(wrapped)
        setStatus(QRDisplayStatus.ERROR)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [agent, retryToken, logger, label])

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
