import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ServiceOutage } from './ServiceOutage'

const mockHandleCheckAgain = jest.fn()
const mockHandleLearnMore = jest.fn()

jest.mock('./useServiceOutageViewModel', () => () => ({
  headerText: 'Service unavailable',
  contentText: ['The service is currently down.'],
  learnMoreText: 'Learn more',
  buttonText: 'Check again',
  isCheckDisabled: false,
  handleCheckAgain: mockHandleCheckAgain,
  handleLearnMore: mockHandleLearnMore,
}))

jest.mock('@/hooks/usePreventGestureBack', () => jest.fn())

describe('ServiceOutage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should match snapshot', () => {
    const tree = render(
      <BasicAppContext>
        <ServiceOutage />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('renders header, content, and buttons', () => {
    const { getByText } = render(
      <BasicAppContext>
        <ServiceOutage />
      </BasicAppContext>
    )

    expect(getByText('Service unavailable')).toBeTruthy()
    expect(getByText('The service is currently down.')).toBeTruthy()
    expect(getByText('Learn more')).toBeTruthy()
    expect(getByText('Check again')).toBeTruthy()
  })

  it('calls handleCheckAgain when Check again button is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <ServiceOutage />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('ServiceOutageCheckAgain')))

    expect(mockHandleCheckAgain).toHaveBeenCalled()
  })

  it('calls handleLearnMore when Learn more button is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <ServiceOutage />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('ServiceOutageHelpCentre')))

    expect(mockHandleLearnMore).toHaveBeenCalled()
  })
})
