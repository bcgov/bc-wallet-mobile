import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_LOGIN_PRIVACY_URL } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { OnboardingOptInAnalyticsScreen } from './OnboardingOptInAnalyticsScreen'

describe('OnboardingOptInAnalytics', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <OnboardingOptInAnalyticsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('navigates to WebView when Learn More is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <OnboardingOptInAnalyticsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    const learnMoreButton = getByTestId(testIdWithKey('LearnMore'))
    fireEvent.press(learnMoreButton)

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingWebView, {
      title: 'BCSC.Onboarding.PrivacyPolicyTitle',
      url: BC_LOGIN_PRIVACY_URL,
    })
  })
})
