import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ServiceOutage } from './ServiceOutage'

const mockHandleCheckAgain = jest.fn()

jest.mock('./useServiceOutageViewModel', () => () => ({
  headerText: 'Service unavailable',
  contentText: ['The service is currently down.'],
  skipVerificationText: 'Skip verification',
  buttonText: 'Check again',
  isCheckDisabled: false,
  isAvailable: false,
  handleCheckAgain: mockHandleCheckAgain,
}))

describe('ServiceOutage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderOutage = (props = {}) =>
    render(
      <BasicAppContext>
        <ServiceOutage {...props} />
      </BasicAppContext>
    )

  it('should match snapshot', () => {
    expect(renderOutage().toJSON()).toMatchSnapshot()
  })

  it('renders header, content, and the check again button', () => {
    const { getByText } = renderOutage()

    expect(getByText('Service unavailable')).toBeTruthy()
    expect(getByText('The service is currently down.')).toBeTruthy()
    expect(getByText('Check again')).toBeTruthy()
  })

  it('calls handleCheckAgain when Check again is pressed', () => {
    const { getByTestId } = renderOutage()

    fireEvent.press(getByTestId(testIdWithKey('ServiceOutageCheckAgain')))

    expect(mockHandleCheckAgain).toHaveBeenCalled()
  })

  it('hides the skip button outside onboarding', () => {
    const { queryByTestId } = renderOutage()

    expect(queryByTestId(testIdWithKey('ServiceOutageSkipVerification'))).toBeNull()
  })

  it('hides the skip button in onboarding when no onSkipVerification handler is given', () => {
    const { queryByTestId } = renderOutage({ inOnboarding: true })

    expect(queryByTestId(testIdWithKey('ServiceOutageSkipVerification'))).toBeNull()
  })

  it('shows the skip button and wires it when inOnboarding and onSkipVerification are provided', () => {
    const onSkipVerification = jest.fn()
    const { getByTestId } = renderOutage({ inOnboarding: true, onSkipVerification })

    fireEvent.press(getByTestId(testIdWithKey('ServiceOutageSkipVerification')))

    expect(onSkipVerification).toHaveBeenCalledTimes(1)
  })
})
