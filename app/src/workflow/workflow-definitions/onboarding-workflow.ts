import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { WorkflowDefinition } from '@/workflow/WorkflowEngineContext'

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
    nextStep: null, // TODO (MD): Temporary last step until Biometrics and PIN
    previousStep: 'Notifications',
  },
}
