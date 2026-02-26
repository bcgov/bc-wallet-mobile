import { WHERE_TO_USE_URL } from '@/constants'
import { BCSCScreens } from '@bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { IntroCarouselScreen } from './IntroCarousel'

describe('IntroCarouselScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render correctly', () => {
      const tree = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })

    it('should display the first carousel page content', () => {
      const { getByText } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.Onboarding.CarouselServicesHeader')).toBeTruthy()
      expect(getByText('BCSC.Onboarding.CarouselServicesContent')).toBeTruthy()
    })

    it('should display the "Where to use" button on the first carousel page', () => {
      const { getByText } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.Home.WhereToUseTitle')).toBeTruthy()
    })

    it('should display all three carousel pages', () => {
      const { getByText } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.Onboarding.CarouselServicesHeader')).toBeTruthy()
      expect(getByText('BCSC.Onboarding.CarouselProveHeader')).toBeTruthy()
      expect(getByText('BCSC.Onboarding.CarouselCannotUseHeader')).toBeTruthy()
    })
  })

  describe('Navigation', () => {
    it('should navigate to OnboardingWebView when "Where to use" button is pressed', () => {
      const { getByText } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      fireEvent.press(getByText('BCSC.Home.WhereToUseTitle'))

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingWebView, {
        title: 'BCSC.Onboarding.CarouselServicesHeader',
        url: WHERE_TO_USE_URL,
      })
    })

    it('should navigate to the next carousel page when Next is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      fireEvent.press(getByTestId(testIdWithKey('CarouselNext')))

      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })

    it('should navigate to OnboardingPrivacyPolicy when Next is pressed on the last page', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const nextButton = getByTestId(testIdWithKey('CarouselNext'))

      // Navigate through all pages
      fireEvent.press(nextButton)
      fireEvent.press(nextButton)
      fireEvent.press(nextButton)

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingPrivacyPolicy)
    })

    it('should not navigate back when Back is pressed on the first page', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <IntroCarouselScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const backButton = getByTestId(testIdWithKey('CarouselBack'))

      expect(backButton.props.accessibilityState.disabled).toBe(true)
    })
  })
})
