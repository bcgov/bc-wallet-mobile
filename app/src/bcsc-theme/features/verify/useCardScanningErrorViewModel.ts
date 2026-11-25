import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnterNonBcscFlow } from './useEnterNonBcscFlow'

/**
 * Handlers for the screen shown when the scanner keeps failing to read a card.
 */
export const useCardScanningErrorViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CardScanningError>
) => {
  const { t } = useTranslation()
  const { enterNonBcscFlow } = useEnterNonBcscFlow(navigation, '[CardScanningError]')

  const handleCheckCard = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      title: t('BCSC.Screens.HelpCentre'),
      url: HelpCentreUrl.HELP_CHECK_BCSC,
    })
  }, [navigation, t])

  /** Returns to the scanner, which resets itself on focus. */
  const handleScanAgain = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  /** Replaces this screen, so back from manual entry returns to the scanner. */
  const handleEnterManually = useCallback(() => {
    navigation.replace(BCSCScreens.ManualSerial)
  }, [navigation])

  /** Enters the non-BCSC flow; back returns to IdentitySelection, not the scanner. */
  const handleUseAnotherId = useCallback(
    () => enterNonBcscFlow([{ name: BCSCScreens.DualIdentificationRequired }], 'User chose to try another card'),
    [enterNonBcscFlow]
  )

  return { handleCheckCard, handleScanAgain, handleEnterManually, handleUseAnotherId }
}
