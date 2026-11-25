import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { popToThenPush, RouteToPush } from '@/bcsc-theme/utils/pop-to-then-navigate'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'

/**
 * Moves the user from a failed or wrong card scan into the non-BCSC flow: saves the card process,
 * clears any half-scanned card data, then opens `routes` above IdentitySelection so back walks
 * down through them to it.
 *
 * Repeat calls while one is in flight are ignored. A failed storage write alerts the user, keeps
 * them on the current screen and allows a retry.
 *
 * @param navigation - The verify stack navigation of the calling screen.
 * @param logTag - Prefix for log lines, such as `[CardScanningError]`.
 */
export const useEnterNonBcscFlow = (
  navigation: Pick<NavigationProp<BCSCVerifyStackParams>, 'dispatch'>,
  logTag: string
) => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateCardProcess, deleteScannedCardData } = useSecureActions()
  const { failedToWriteToLocalStorageAlert } = useAlerts()
  const isEnteringRef = useRef(false)

  const hasScannedCardData = Boolean(store.bcscSecure.birthdate || store.bcscSecure.serial)

  /**
   * @param routes - The non-BCSC flow routes to open above IdentitySelection, in order.
   * @param reason - Why the user is leaving, for the log. Must not hold card data.
   */
  const enterNonBcscFlow = useCallback(
    async (routes: readonly RouteToPush<BCSCVerifyStackParams>[], reason: string) => {
      if (isEnteringRef.current) {
        return
      }
      isEnteringRef.current = true

      try {
        logger.info(`${logTag} ${reason}, entering the non-BCSC flow`)
        await updateCardProcess(BCSCCardProcess.NonBCSC)
        if (hasScannedCardData) {
          await deleteScannedCardData()
        }

        popToThenPush<BCSCVerifyStackParams>(navigation, BCSCScreens.IdentitySelection, routes)
      } catch (error) {
        logger.error(`${logTag} Failed to enter the non-BCSC flow`, error as Error)
        failedToWriteToLocalStorageAlert(error)
        isEnteringRef.current = false
      }
    },
    [
      logger,
      logTag,
      navigation,
      updateCardProcess,
      deleteScannedCardData,
      failedToWriteToLocalStorageAlert,
      hasScannedCardData,
    ]
  )

  return { enterNonBcscFlow }
}
