import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { TermsOfUseUpdated } from '../features/modal/TermsOfUseUpdated'
import { BCSCModals } from '../types/navigators'
import VerifyStack from './VerifyStack'

// Partial: screen modules build themes from the real exports when imported
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
  useTheme: jest.fn(() => ({})),
  useDefaultStackOptions: jest.fn(() => ({})),
}))
jest.mock('@react-navigation/stack', () => {
  // Registered, not rendered: the tests read which routes the navigator offers
  const Screen = () => null
  Screen.displayName = 'Screen'
  const Navigator = ({ children }: any) => children
  Navigator.displayName = 'Navigator'
  return {
    createStackNavigator: () => ({ Navigator, Screen }),
    Navigator,
    Screen,
  }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock('./stack-utils', () => ({
  getDefaultModalOptions: jest.fn(() => ({})),
}))
jest.mock('../contexts/BCSCStackContext', () => ({
  useBCSCStack: jest.fn(),
}))
jest.mock('../hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ clearAdditionalEvidence: jest.fn() }),
}))
jest.mock('../hooks/useSystemChecks', () => ({
  SystemCheckScope: { VERIFY: 'VERIFY' },
  useSystemChecks: jest.fn(),
}))
jest.mock('../features/verification-response/useVerificationResponseListener', () => ({
  useVerificationResponseListener: jest.fn(),
}))
jest.mock('../utils/resume-step-route', () => ({
  getResumeStepRoute: () => ({ name: 'IdentitySelection' }),
}))

describe('VerifyStack', () => {
  beforeEach(() => {
    jest.mocked(Bifold.useStore).mockReturnValue([{ bcsc: {}, bcscSecure: {} }, jest.fn()] as any)
  })

  const findScreen = (name: string) =>
    render(<VerifyStack />)
      .UNSAFE_queryAllByType(jest.requireMock('@react-navigation/stack').Screen)
      .find((screen) => screen.props.name === name)

  it("registers the Terms of Use prompt, which the main stack's check can raise after the user left Home to verify", () => {
    const screen = findScreen(BCSCModals.TermsOfUseUpdated)

    expect(screen?.props.component).toBe(TermsOfUseUpdated)
    // Blocking, as on the main stack: no swipe dismisses it before the user accepts
    expect(screen?.props.options).toMatchObject({ gestureEnabled: false })
  })
})
