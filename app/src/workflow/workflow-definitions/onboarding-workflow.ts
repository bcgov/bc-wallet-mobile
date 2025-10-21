import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { WorkflowDefinition } from '@/workflow/WorkflowEngineContext'
import { OnboardingSecureAppMethod } from '../../bcsc-theme/features/onboarding/SecureAppScreen'

type OnboardingWorkflowSteps = 'Intro' | 'PrivacyPolicy' | 'TermsOfUse' | 'Notifications' | 'SecureApp'

export const OnboardingWorkflow: WorkflowDefinition<OnboardingWorkflowSteps> = {
  Intro: {
    screen: BCSCScreens.OnboardingIntroCarouselScreen,
    nextStep: 'PrivacyPolicy',
    previousStep: null,
  },
  PrivacyPolicy: {
    screen: BCSCScreens.OnboardingPrivacyPolicyScreen,
    nextStep: 'TermsOfUse',
    previousStep: 'Intro',
  },
  TermsOfUse: {
    screen: BCSCScreens.OnboardingTermsOfUseScreen,
    nextStep: 'Notifications',
    previousStep: 'PrivacyPolicy',
  },
  Notifications: {
    screen: BCSCScreens.OnboardingNotificationsScreen,
    nextStep: 'SecureApp',
    previousStep: 'TermsOfUse',
  },
  SecureApp: {
    screen: BCSCScreens.OnboardingSecureAppScreen,
    nextStep: (secureMethod: OnboardingSecureAppMethod) => {
      if (secureMethod === OnboardingSecureAppMethod.PIN) {
        // TODO (MD): Replace with Create PIN step
        return '' as OnboardingWorkflowSteps
      }

      if (secureMethod === OnboardingSecureAppMethod.BIOMETRICS) {
        // TODO (MD): Replace with Biometric setup step
        return '' as OnboardingWorkflowSteps
      }

      throw new Error(`OnboardingWorkflow: invalid SecureApp method: ${secureMethod}`)
    },
    previousStep: 'Notifications',
  },
}
