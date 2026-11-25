import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { popToThenPush } from '@/bcsc-theme/utils/pop-to-then-navigate'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'

/**
 * Handlers for the screen shown when the scanner reads a driver's licence instead of a BC Services Card.
 */
export const useScannedDriversLicenceViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ScannedDriversLicence>
) => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateCardProcess, deleteScannedCardData } = useSecureActions()
  const { failedToWriteToLocalStorageAlert } = useAlerts()
  const isNavigatingRef = useRef(false)

  /**
   * Enters the non-BCSC flow at its ID list, as if the user had chosen it on IdentitySelection.
   * Back walks the same way: ID list, DualIdentificationRequired, then IdentitySelection.
   */
  const handleContinueWithLicence = useCallback(async () => {
    if (isNavigatingRef.current) {
      return
    }
    isNavigatingRef.current = true

    try {
      logger.info('[ScannedDriversLicence] User chose to continue with a licence, entering the non-BCSC flow')
      await updateCardProcess(BCSCCardProcess.NonBCSC)
      if (store.bcscSecure.birthdate || store.bcscSecure.serial) {
        await deleteScannedCardData()
      }

      popToThenPush<BCSCVerifyStackParams>(navigation, BCSCScreens.IdentitySelection, [
        { name: BCSCScreens.DualIdentificationRequired },
        { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } },
      ])
    } catch (error) {
      logger.error('[ScannedDriversLicence] Failed to enter the non-BCSC flow', error as Error)
      failedToWriteToLocalStorageAlert(error)
      isNavigatingRef.current = false
    }
  }, [
    logger,
    navigation,
    updateCardProcess,
    deleteScannedCardData,
    failedToWriteToLocalStorageAlert,
    store.bcscSecure.birthdate,
    store.bcscSecure.serial,
  ])

  /** Returns to the scanner, dropping this screen so back from the scanner can't reach it. */
  const handleScanServicesCard = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return { handleContinueWithLicence, handleScanServicesCard }
}
