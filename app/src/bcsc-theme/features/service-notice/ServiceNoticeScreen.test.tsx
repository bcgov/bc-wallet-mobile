import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ServiceNoticeScreen } from './ServiceNoticeScreen'

const mockHandleContactUs = jest.fn()

jest.mock('./useServiceNoticeViewModel', () => () => ({
  headerText: 'Service notice',
  messageText: 'This service will undergo scheduled maintenance on Saturday.',
  sections: [
    {
      heading: 'Setting up a mobile card?',
      description: 'It may take longer to get your identity verified.',
      bullets: ['Video call – it may take more than 5 minutes', 'Send video – it may take more than 3 days'],
    },
    { heading: 'Logging into a government service?', description: 'Please be patient.' },
  ],
  haveQuestionsText: 'Have questions?',
  contactUsLinkText: 'Contact us',
  contactUsLinkHint: 'This opens in browser',
  handleContactUs: mockHandleContactUs,
}))

describe('ServiceNoticeScreen', () => {
  const renderScreen = () =>
    render(
      <BasicAppContext>
        <ServiceNoticeScreen />
      </BasicAppContext>
    )

  it('renders the heading, the notice and the contact prompt', () => {
    const { getByText } = renderScreen()

    expect(getByText('Service notice')).toBeTruthy()
    expect(getByText('This service will undergo scheduled maintenance on Saturday.')).toBeTruthy()
    expect(getByText('Have questions?')).toBeTruthy()
    expect(getByText('Contact us')).toBeTruthy()
  })

  it('renders each guidance section with its bullets', () => {
    const { getByText } = renderScreen()

    expect(getByText('Setting up a mobile card?')).toBeTruthy()
    expect(getByText('It may take longer to get your identity verified.')).toBeTruthy()
    expect(getByText('Video call – it may take more than 5 minutes')).toBeTruthy()
    expect(getByText('Send video – it may take more than 3 days')).toBeTruthy()
    expect(getByText('Logging into a government service?')).toBeTruthy()
    expect(getByText('Please be patient.')).toBeTruthy()
  })

  it('tells screen readers that Contact us opens the browser', () => {
    const { getByTestId } = renderScreen()

    expect(getByTestId(testIdWithKey(TestIds.main.serviceNotice.contactUs)).props.accessibilityHint).toBe(
      'This opens in browser'
    )
  })

  it('calls handleContactUs when Contact us is pressed', () => {
    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey(TestIds.main.serviceNotice.contactUs)))

    expect(mockHandleContactUs).toHaveBeenCalledTimes(1)
  })
})
