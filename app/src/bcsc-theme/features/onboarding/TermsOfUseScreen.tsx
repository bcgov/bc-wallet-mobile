import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { TermsOfUseContent } from './TermsOfUseContent'

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUse>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {React.ReactElement} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = ({ navigation }: TermsOfUseScreenProps): React.ReactElement => {
  const [, dispatch] = useStore<BCState>()

  const handleAccept = useCallback(
    (termsOfUse: TermsOfUseResponseData) => {
      dispatch({
        type: BCDispatchAction.UPDATE_ACCEPTED_TERMS_OF_USE_VERSION,
        payload: [String(termsOfUse.version)],
      })

      // Analytics opt-in is next; that screen handles skipping the notifications step when
      // notification permission has already been granted.
      navigation.navigate(BCSCScreens.OnboardingOptInAnalytics)
    },
    [dispatch, navigation]
  )

  return <TermsOfUseContent onAccept={handleAccept} />
}
