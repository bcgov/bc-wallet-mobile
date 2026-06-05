import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
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
    async (termsOfUse: TermsOfUseResponseData) => {
      dispatch({
        type: BCDispatchAction.UPDATE_ACCEPTED_TERMS_OF_USE_VERSION,
        payload: [String(termsOfUse.version)],
      })

      const status = await PushNotifications.status()

      // if permission is granted, skip notification screen
      if (status === PushNotifications.NotificationPermissionStatus.GRANTED) {
        return navigation.navigate(BCSCScreens.OnboardingSecureApp)
      }

      navigation.navigate(BCSCScreens.OnboardingNotifications)
    },
    [dispatch, navigation]
  )

  return <TermsOfUseContent onAccept={handleAccept} />
}
