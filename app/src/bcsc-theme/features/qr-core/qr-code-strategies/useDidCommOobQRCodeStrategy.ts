import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCState } from '@/store'
import {
  isDidCommInvitation,
  isOpenIdCredentialOffer,
  isOpenIdPresentationRequest,
  QrCodeScanError,
  TOKENS,
  useServices,
  useStore,
} from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeStrategy } from '../useQRScanner'

// Aries-standard goal code for mediator invitations; checked inline so we only parse the invitation once.
const MEDIATOR_GOAL_CODE = 'aries.vc.mediate'

// Extend the type to include the handleOobRecordId function (still satisfies QRCodeStrategy)
type DidCommOobQRCodeStrategy = QRCodeStrategy & {
  handleOobRecordId: (uri: string) => Promise<string>
}

/**
 * Creates a QRCodeStrategy for DIDComm out-of-band invitations. Calls onSuccess with the OOB record id.
 */
export const useDidCommOobQRCodeStrategy = (
  /**
   * Callback invoked when a DIDComm OOB invitation is successfully processed.
   * @param oobRecordId The ID of the out-of-band record created or reused.
   * @returns void
   */
  onSuccess?: (oobRecordId: string) => void,
  /**
   * Optional label to use for the connection; if not provided, the wallet's nickname will be used.
   */
  invitationLabel?: string
): DidCommOobQRCodeStrategy => {
  const { t } = useTranslation()
  const { waitForAgent } = useBCSCAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  // Sent to the inviter as our label; mirrors the name shown by `WalletNameDisplay`
  const label = invitationLabel || store.bcsc.selectedNickname || 'My Wallet'

  const matches = useCallback((uri: string): boolean => {
    return (
      isDidCommInvitation(uri) ||
      isOpenIdCredentialOffer(uri) ||
      isOpenIdPresentationRequest(uri) ||
      isVcAuthnLogin(uri)
    )
  }, [])

  const handleOobRecordId = useCallback(
    async (uri: string): Promise<string> => {
      // agent may still be booting, so wait for it before proceeding
      const agent = await waitForAgent()

      if (!agent) {
        throw new QrCodeScanError(t('BCSC.Scan.Unsupported.AgentNotReady'), uri)
      }

      if (isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)) {
        logger.info('[useDidCommOobQRCodeStrategy] OpenID URI rejected (BCSC v4.1 is AnonCreds-only)')
        throw new QrCodeScanError(t('BCSC.Scan.Unsupported.OpenID'), uri)
      }

      // TODO (MD): Fully type the agent and it's modules
      const invitation = await agent.modules.didcomm.oob.parseInvitation(uri)
      if (!invitation) {
        logger.warn('[useDidCommOobQRCodeStrategy] could not parse OOB invitation')
        throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), uri)
      }

      if (invitation.goalCode === MEDIATOR_GOAL_CODE) {
        logger.info('[useDidCommOobQRCodeStrategy] mediator invitation rejected (BCSC uses .env mediator)')
        throw new QrCodeScanError(t('BCSC.Scan.Unsupported.Mediator'), uri)
      }

      // Duplicate scans of the same invitation @id would leave the user stuck on "Connecting…"
      const existing = await agent.modules.didcomm.oob.findByReceivedInvitationId(invitation.id)
      if (existing) {
        logger.info(`[useDidCommOobQRCodeStrategy] reusing existing OOB record ${existing.id}`)
        return existing.id
      }

      const { outOfBandRecord } = await agent.modules.didcomm.oob.receiveInvitation(invitation, { label })

      return outOfBandRecord.id
    },
    [waitForAgent, logger, label, t]
  )

  const handle = useCallback(
    async (uri: string): Promise<void> => {
      const recordId = await handleOobRecordId(uri)
      onSuccess?.(recordId)
    },
    [handleOobRecordId, onSuccess]
  )

  return useMemo(() => ({ matches, handle, handleOobRecordId }), [matches, handle, handleOobRecordId])
}

/**
 * Checks if a given URI is a VC Authn login URI.
 *
 * @example https://example.com/url/pres_exch/123e4567-e89b-12d3-a456-426614174000
 *
 * @param uri The URI to check
 * @returns True if the URI is a VC Authn URI, false otherwise
 */
function isVcAuthnLogin(uri: string): boolean {
  let url: URL
  const vcauthnRegex = /^\/url\/pres_exch\/[0-9a-f-]{36}\/?$/i

  try {
    url = new URL(uri)
  } catch {
    return false
  }

  return vcauthnRegex.test(url.pathname)
}
