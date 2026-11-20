import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { BCSCMainStackParams, BCSCModals, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { TermsOfUseContent } from '../onboarding/TermsOfUseContent'

type TermsOfUseUpdatedProps = StackScreenProps<BCSCMainStackParams, BCSCModals.TermsOfUseUpdated>

/**
 * Blocking modal displayed when the server's Terms of Use version differs from the
 * version the user last accepted. The user must accept the updated terms to continue.
 *
 * @see {TermsOfUseSystemCheck.ts} for the system check that presents this modal.
 *
 * @returns {*} {React.ReactElement} The TermsOfUseUpdated component.
 */
export const TermsOfUseUpdated = ({ navigation }: TermsOfUseUpdatedProps): React.ReactElement => {
  const { t } = useTranslation()

  const handleAccept = useCallback(
    (termsOfUse: TermsOfUseResponseData) => {
      void getBCSCState().app.update({ acceptedTermsOfUseVersion: String(termsOfUse.version) })

      // Dismiss deterministically: return to the previous route if there is one,
      // otherwise fall back to the tab stack so the user is never stranded.
      if (navigation.canGoBack()) {
        navigation.goBack()
        return
      }

      navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    },
    [navigation]
  )

  return <TermsOfUseContent onAccept={handleAccept} headerText={t('BCSC.Modals.TermsOfUseUpdated.Header')} />
}
