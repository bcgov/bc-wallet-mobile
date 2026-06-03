import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { TOKENS, useServices } from '@bifold/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'

import { BCSCMainStackParams, BCSCScreens } from '../../types/navigators'
import { DidCommOobStrategy } from '../qr-core/uri-strategies'
import { useConnectionInvitationService } from './ConnectionInvitationServiceContext'

/**
 * Drains out-of-band connection invitations captured by
 * {@link ConnectionInvitationService} (e.g. a cold-start
 * `bcwallet://aries_connection_invitation?oob=...` deep link), accepts them via
 * the shared DIDComm OOB strategy once the agent is ready, and navigates to the
 * Connection screen. Must be mounted inside the agent scope (it reads
 * {@link useBCSCAgent}).
 *
 * Convergence: deep-link and QR-scanned invitations both run through
 * {@link DidCommOobStrategy} and land on the same `ConnectionLoading` screen.
 */
export const useConnectionInvitationDeepLink = (): void => {
  const service = useConnectionInvitationService()
  const { agent, loading } = useBCSCAgent()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)

  useEffect(() => service.onInvitation(({ url }) => setInvitationUrl(url)), [service])

  useEffect(() => {
    // Wait for the agent to reach 'ready' (loading === false) before accepting.
    if (!invitationUrl || !agent || loading) {
      return
    }

    let cancelled = false

    const accept = async () => {
      // Gating on 'ready' is necessary but not sufficient on cold start: the
      // agent reports ready once `initiateMessagePickup` was *awaited*, but the
      // mediator live-pickup socket may not be flushing yet — so the inviter's
      // connection response sits at the mediator and the Connection screen hangs
      // (#2288). (Re)starting live pickup here flushes the queue, mirroring what
      // the foreground handler does. BCSC has no foreground re-kick on cold
      // start, so this is the deterministic fix for the deep-link path.
      try {
        await agent.didcomm.mediationRecipient.initiateMessagePickup(
          undefined,
          DidCommMediatorPickupStrategy.PickUpV2LiveMode
        )
      } catch (err) {
        logger.error(`[ConnectionInvitationDeepLink] message pickup (re)start failed: ${err}`)
      }

      try {
        const result = await DidCommOobStrategy.handle(invitationUrl, { agent, logger })
        if (cancelled) {
          return
        }
        setInvitationUrl(null)

        switch (result.kind) {
          case 'connection':
            navigation.navigate(BCSCScreens.ConnectionLoading, { oobRecordId: result.oobRecordId })
            break
          case 'unsupported':
            Toast.show({ type: 'error', text1: t(`BCSC.Scan.Unsupported.${result.reason}`) })
            break
          default:
            logger.warn(`[ConnectionInvitationDeepLink] invitation not actionable: ${result.kind}`)
            Toast.show({ type: 'error', text1: t('BCSC.Scan.InvalidConnectionInvitation') })
            break
        }
      } catch (err) {
        if (cancelled) {
          return
        }
        setInvitationUrl(null)
        logger.error(`[ConnectionInvitationDeepLink] failed to accept invitation: ${err}`)
        Toast.show({ type: 'error', text1: t('BCSC.Scan.InvalidConnectionInvitation') })
      }
    }

    accept()

    return () => {
      cancelled = true
    }
  }, [invitationUrl, agent, loading, navigation, logger, t])
}
