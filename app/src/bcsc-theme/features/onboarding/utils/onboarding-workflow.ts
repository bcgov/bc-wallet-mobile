import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { WorkflowStep } from '@/contexts/WorkflowEngineContext'
import { OnboardingSecureAppMethod } from '../SecureAppScreen'

export const OnboardingWorkflow: WorkflowStep[] = [
  {
    screen: BCSCScreens.OnboardingIntroCarouselScreen,
    nextScreen: BCSCScreens.OnboardingPrivacyPolicyScreen,
    previousScreen: null,
  },
  {
    screen: BCSCScreens.OnboardingPrivacyPolicyScreen,
    nextScreen: BCSCScreens.OnboardingTermsOfUseScreen,
    previousScreen: BCSCScreens.OnboardingIntroCarouselScreen,
  },
  {
    screen: BCSCScreens.OnboardingTermsOfUseScreen,
    nextScreen: BCSCScreens.OnboardingNotificationsScreen,
    previousScreen: BCSCScreens.OnboardingPrivacyPolicyScreen,
  },
  {
    screen: BCSCScreens.OnboardingNotificationsScreen,
    nextScreen: BCSCScreens.OnboardingSecureAppScreen,
    previousScreen: BCSCScreens.OnboardingTermsOfUseScreen,
  },
  {
    screen: BCSCScreens.OnboardingSecureAppScreen,
    nextScreen: (secureMethod: OnboardingSecureAppMethod) => {
      if (secureMethod === OnboardingSecureAppMethod.PIN) {
        return 'TODO (MD): Replace with Create PIN screen'
      }

      if (secureMethod === OnboardingSecureAppMethod.BIOMETRICS) {
        return 'TODO (MD): Replace with Biometric setup screen'
      }

      throw new Error(`Invalid secure app method for workflow engine step: ${secureMethod}`)
    },
    previousScreen: BCSCScreens.OnboardingNotificationsScreen,
  },
]
