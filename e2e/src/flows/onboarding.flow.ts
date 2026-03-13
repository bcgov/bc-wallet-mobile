// src/flows/onboarding.flow.ts
import OnboardingScreen from '../screens/OnboardingScreen'
import PinScreen from '../screens/PinScreen'

export async function completeFullOnboarding(pin = '000000') {
  await OnboardingScreen.waitForDisplayed()
  await OnboardingScreen.completeOnboarding()
  await PinScreen.waitForDisplayed()
  await PinScreen.enterPin(pin)
  await PinScreen.confirmPin(pin)
}
