import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ServiceOutage } from './ServiceOutage'

const mockHandleCheckAgain = jest.fn()

jest.mock('./useServiceOutageViewModel', () => () => ({
  headerText: 'Service unavailable',
  contentText: ['The service is currently down.'],
  inTheMeantimeText: 'In the meantime, check the service.',
  needHelpPrefixText: 'If you need help, ',
  contactUsLinkText: 'contact us',
  contactLink: 'https://id.gov.bc.ca/static/help/contact-us.html',
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

  it('opens the contact link in the browser when the contact us link is pressed', async () => {
    const { getByTestId } = renderOutage()
    const { Linking } = jest.requireActual('react-native')
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true as never)
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)

    fireEvent.press(getByTestId(testIdWithKey('ServiceOutageContactUs')))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://id.gov.bc.ca/static/help/contact-us.html'))
    canOpenSpy.mockRestore()
    openSpy.mockRestore()
  })
})
