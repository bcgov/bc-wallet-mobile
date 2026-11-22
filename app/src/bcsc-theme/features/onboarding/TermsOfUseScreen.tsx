import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { useApp } from '@/bcsc-theme/storage/hooks'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
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
  const { update: updateApp } = useApp()
  const handleAccept = useCallback(
    (termsOfUse: TermsOfUseResponseData) => {
      void updateApp({ acceptedTermsOfUseVersion: String(termsOfUse.version) })

      // Analytics opt-in is next; that screen handles skipping the notifications step when
      // notification permission has already been granted.
      navigation.navigate(BCSCScreens.OnboardingOptInAnalytics)
    },
    [navigation, updateApp]
  )

  return <TermsOfUseContent onAccept={handleAccept} />
}
