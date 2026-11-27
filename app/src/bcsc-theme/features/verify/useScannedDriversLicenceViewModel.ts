import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { useEnterNonBcscFlow } from './useEnterNonBcscFlow'

/**
 * Handlers for the screen shown when the scanner reads a driver's licence instead of a BC Services Card.
 */
export const useScannedDriversLicenceViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ScannedDriversLicence>
) => {
  const { enterNonBcscFlow } = useEnterNonBcscFlow(navigation, '[ScannedDriversLicence]')

  /**
   * Enters the non-BCSC flow at its ID list, as if the user had chosen it on IdentitySelection.
   * Back walks the same way: ID list, DualIdentificationRequired, then IdentitySelection.
   */
  const handleContinueWithLicence = useCallback(
    () =>
      enterNonBcscFlow(
        [
          { name: BCSCScreens.DualIdentificationRequired },
          { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } },
        ],
        'User chose to continue with a licence'
      ),
    [enterNonBcscFlow]
  )

  /** Returns to the scanner, dropping this screen so back from the scanner can't reach it. */
  const handleScanServicesCard = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return { handleContinueWithLicence, handleScanServicesCard }
}
