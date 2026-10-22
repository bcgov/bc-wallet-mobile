import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { isDidCommInvitationCandidate } from '@/bcsc-theme/utils/didcomm-invitation'
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

// Extend the type to include the handleOobRecordId function (still satisfies QRCodeStrategy).
// It resolves to undefined when the invitation was handed to another handler instead of accepted.
type DidCommOobQRCodeStrategy = QRCodeStrategy & {
  handleOobRecordId: (uri: string) => Promise<string | undefined>
}

export interface DidCommOobQRCodeStrategyOptions {
  /** Label sent to the inviter; defaults to the wallet's nickname. */
  invitationLabel?: string
  /** Receives a mediator invitation instead of it being rejected, while developer mode is on. */
  onMediatorInvitation?: (uri: string) => void
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
  { invitationLabel, onMediatorInvitation }: DidCommOobQRCodeStrategyOptions = {}
): DidCommOobQRCodeStrategy => {
  const { t } = useTranslation()
  const { waitForAgent } = useBCSCAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  // Sent to the inviter as our label; mirrors the name shown by `WalletNameDisplay`
  const label = invitationLabel || store.bcsc.selectedNickname || 'My Wallet'

  const matches = useCallback((uri: string): boolean => {
    return isDidCommInvitationCandidate(uri) || isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)
  }, [])

  const handleOobRecordId = useCallback(
    async (uri: string): Promise<string | undefined> => {
      // agent may still be booting, so wait for it before proceeding
      const agent = await waitForAgent()

      if (!agent) {
        throw new QrCodeScanError(t('BCSC.Scan.Unsupported.AgentNotReady'), uri)
      }

      if (isOpenIdCredentialOffer(uri) || isOpenIdPresentationRequest(uri)) {
        logger.info('[useDidCommOobQRCodeStrategy] OpenID URI rejected (BCSC v4.1 is AnonCreds-only)')
        throw new QrCodeScanError(t('BCSC.Scan.Unsupported.OpenID'), uri)
      }

      let invitation
      try {
        // TODO (MD): Fully type the agent and it's modules
        invitation = await agent.modules.didcomm.oob.parseInvitation(uri)
      } catch (error) {
        if (isDidCommInvitation(uri)) {
          throw error
        }
        // Bare URL that didn't resolve to an invitation, most likely an ordinary web link
        logger.warn(`[useDidCommOobQRCodeStrategy] URL did not resolve to an OOB invitation: ${error}`)
        throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), uri, String(error))
      }
      if (!invitation) {
        logger.warn('[useDidCommOobQRCodeStrategy] could not parse OOB invitation')
        throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), uri)
      }

      if (invitation.goalCode === MEDIATOR_GOAL_CODE) {
        if (store.preferences.developerModeEnabled && onMediatorInvitation) {
          logger.info('[useDidCommOobQRCodeStrategy] mediator invitation handed to the developer-mode mediator picker')
          onMediatorInvitation(uri)
          return undefined
        }
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
    [waitForAgent, logger, label, t, store.preferences.developerModeEnabled, onMediatorInvitation]
  )

  const handle = useCallback(
    async (uri: string): Promise<void> => {
      const recordId = await handleOobRecordId(uri)
      if (recordId) {
        onSuccess?.(recordId)
      }
    },
    [handleOobRecordId, onSuccess]
  )

  return useMemo(() => ({ matches, handle, handleOobRecordId }), [matches, handle, handleOobRecordId])
}
