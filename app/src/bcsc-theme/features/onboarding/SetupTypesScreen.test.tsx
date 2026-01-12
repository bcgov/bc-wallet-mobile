import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { BCSCScreens } from '@bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import SetupTypesScreen from './SetupTypesScreen'

describe('SetupTypesScreen', () => {
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
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })

    it('should have My own ID selected by default when screen loads', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      const myOwnIdOption = getByTestId(testIdWithKey('MyOwnIdRadioGroup-option-BCSC.NewSetup.MyOwnID'))
      const someoneElsesIdOption = getByTestId(testIdWithKey('MyOwnIdRadioGroup-option-BCSC.NewSetup.SomeoneElsesID'))

      expect(myOwnIdOption.props.accessibilityState.selected).toBe(true)
      expect(someoneElsesIdOption.props.accessibilityState.selected).toBe(false)
    })
  })

  describe("Someone else's ID flow", () => {
    it("should have Yes selected by default when Someone else's ID is clicked", () => {
      const { getByText, getByTestId } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      // Select "Someone else's ID"
      fireEvent.press(getByText('BCSC.NewSetup.SomeoneElsesID'))

      // Check that "Yes" is selected by default
      const yesOption = getByTestId(testIdWithKey('OtherPersonPresentRadioGroup-option-BCSC.NewSetup.Yes'))
      const noOption = getByTestId(testIdWithKey('OtherPersonPresentRadioGroup-option-BCSC.NewSetup.No'))

      expect(yesOption.props.accessibilityState.selected).toBe(true)
      expect(noOption.props.accessibilityState.selected).toBe(false)
    })

    it("should display help information when Someone else's ID is selected and Yes is chosen", () => {
      const { getByText, queryByText } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      // Initially, help information should not be visible
      expect(queryByText('BCSC.NewSetup.OKToGiveHelp')).toBeNull()

      // Select "Someone else's ID"
      fireEvent.press(getByText('BCSC.NewSetup.SomeoneElsesID'))

      // Now the "Is other person with you" should appear
      expect(getByText('BCSC.NewSetup.IsOtherPersonWithYou')).toBeTruthy()

      // Select "Yes" to display help information
      fireEvent.press(getByText('BCSC.NewSetup.Yes'))

      // Help information should now be visible
      expect(getByText('BCSC.NewSetup.OKToGiveHelp')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCan')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCannot')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCanReadInstructions')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCanNavigateApp')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCanTypeOrScan')).toBeTruthy()
      expect(getByText('BCSC.NewSetup.YouCannotBeInVideo')).toBeTruthy()
    })

    it("should display error when Someone else's ID is selected and No is chosen", () => {
      const { getByText, queryByText } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      // Error should not be visible initially
      expect(queryByText('BCSC.NewSetup.CannotFinishWithoutOtherPerson')).toBeNull()

      // Select "Someone else's ID"
      fireEvent.press(getByText('BCSC.NewSetup.SomeoneElsesID'))

      // Select "No"
      fireEvent.press(getByText('BCSC.NewSetup.No'))

      // Error message should now be visible
      expect(getByText('BCSC.NewSetup.CannotFinishWithoutOtherPerson')).toBeTruthy()
    })

    it('should clear otherPersonPresent state when switching back to My own ID', () => {
      const { getByText, queryByText, getByTestId } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      // Select "Someone else's ID"
      fireEvent.press(getByText('BCSC.NewSetup.SomeoneElsesID'))

      // Verify the "Is other person with you" question appears
      expect(getByText('BCSC.NewSetup.IsOtherPersonWithYou')).toBeTruthy()

      // Select "No" to trigger the error state
      fireEvent.press(getByText('BCSC.NewSetup.No'))

      // Verify error is displayed
      expect(getByText('BCSC.NewSetup.CannotFinishWithoutOtherPerson')).toBeTruthy()

      // Switch back to "My own ID"
      fireEvent.press(getByText('BCSC.NewSetup.MyOwnID'))

      // Verify the "Is other person with you" question is hidden
      expect(queryByText('BCSC.NewSetup.IsOtherPersonWithYou')).toBeNull()

      // Verify error message is hidden
      expect(queryByText('BCSC.NewSetup.CannotFinishWithoutOtherPerson')).toBeNull()

      // Verify help information is hidden
      expect(queryByText('BCSC.NewSetup.OKToGiveHelp')).toBeNull()

      // Verify continue button is enabled
      const continueButton = getByTestId(testIdWithKey('Continue'))
      expect(continueButton.props.accessibilityState.disabled).toBe(false)
    })

    it.todo("should disable continue button when Someone else's ID is selected and No is chosen")
  })

  describe('Navigation', () => {
    it('should navigate to IntroCarousel screen when Continue button is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      const continueButton = getByTestId(testIdWithKey('Continue'))

      // Button should be enabled by default since "My own ID" is pre-selected
      expect(continueButton.props.accessibilityState.disabled).toBe(false)

      fireEvent.press(continueButton)

      // Should navigate to IntroCarousel screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingIntroCarousel)
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
    })

    it('should navigate back when Cancel button is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <SetupTypesScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      const cancelButton = getByTestId(testIdWithKey('Cancel'))

      fireEvent.press(cancelButton)

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1)
    })
  })
})
