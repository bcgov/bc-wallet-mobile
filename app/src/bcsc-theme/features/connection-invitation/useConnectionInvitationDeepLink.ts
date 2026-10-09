import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { TOKENS, useServices } from '@bifold/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'
import { BCSCMainStackParams, BCSCScreens } from '../../types/navigators'
import { useDidCommOobQRCodeStrategy } from '../qr-core/qr-code-strategies/useDidCommOobQRCodeStrategy'
import { useConnectionInvitationService } from './ConnectionInvitationServiceContext'

/**
 * Drains out-of-band connection invitations captured by
 * {@link ConnectionInvitationService} (e.g. a cold-start
 * `bcwallet://aries_connection_invitation?oob=...` deep link), accepts them via
 * the shared DIDComm OOB strategy once the agent is ready, and navigates to the
 * Connection screen. Must be mounted inside the agent scope (it reads
 * {@link useBCSCAgent}).
 */
export const useConnectionInvitationDeepLink = (): void => {
  const service = useConnectionInvitationService()
  const { agent, loading } = useBCSCAgent()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)

  const didCommOobStrategy = useDidCommOobQRCodeStrategy(undefined, 'didcomm-oob-invitation')

  useEffect(() => service.onInvitation(({ url }) => setInvitationUrl(url)), [service])

  useEffect(() => {
    // Wait for the agent to reach 'ready' (loading === false) before accepting.
    if (!invitationUrl || !agent || loading) {
      return
    }

    // Owned by this run, so a newer run can never un-cancel it.
    let cancelled = false

    const accept = async () => {
      // Gating on 'ready' is necessary but not sufficient on cold start: the
      // agent reports ready once `initiateMessagePickup` was *awaited*, but the
      // mediator live-pickup socket may not be flushing yet — so the inviter's
      // connection response sits at the mediator and the Connection screen hangs
      // (#2288).
      //
      // Mirror Bifold's proven foreground recovery (activity.js) with a full
      // stop → start so we always land on a fresh, flushing live session. A bare
      // `initiateMessagePickup` can be a no-op when a (stale) session already
      // exists from agent init, which would leave the queue unflushed. BCSC has
      // no foreground re-kick on cold start, so this is the deterministic fix for
      // the deep-link path.
      try {
        await agent.didcomm.mediationRecipient.stopMessagePickup()
      } catch (err) {
        // Nothing to stop yet (no live session) — the (re)start below is what matters.
        logger.info(`[ConnectionInvitationDeepLink] stopMessagePickup before restart: ${err}`)
      }
      try {
        await agent.didcomm.mediationRecipient.initiateMessagePickup(
          undefined,
          DidCommMediatorPickupStrategy.PickUpV2LiveMode
        )
      } catch (err) {
        logger.error(`[ConnectionInvitationDeepLink] message pickup (re)start failed: ${err}`)
      }

      try {
        const foundRecordId = await didCommOobStrategy.handleOobRecordId(invitationUrl)

        if (cancelled) {
          return
        }

        // Only clear our own URL; a newer invitation may already be queued.
        setInvitationUrl((current) => (current === invitationUrl ? null : current))
        if (foundRecordId) {
          navigation.navigate(BCSCScreens.ConnectionLoading, { oobRecordId: foundRecordId })
        }
      } catch (err) {
        if (cancelled) {
          return
        }
        setInvitationUrl((current) => (current === invitationUrl ? null : current))
        logger.error(`[ConnectionInvitationDeepLink] failed to accept invitation: ${err}`)
        Toast.show({ type: 'error', text1: t('BCSC.Scan.InvalidConnectionInvitation') })
      }
    }

    accept()

    return () => {
      cancelled = true
    }
  }, [invitationUrl, agent, loading, navigation, logger, t, didCommOobStrategy])
}
