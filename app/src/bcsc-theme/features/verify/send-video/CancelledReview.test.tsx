import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import CancelledReview from './CancelledReview'

const mockCleanUpVerificationData = jest.fn()
jest.mock('./CancelledReviewViewModel', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    cleanUpVerificationData: mockCleanUpVerificationData,
  })),
}))

describe('CancelledReview', () => {
  let mockNavigation: any
  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
  })

  it('renders correctly with agent reason', () => {
    const route = { params: { agentReason: 'Face does not match ID document' } } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  it('renders with default message when no agent reason provided', () => {
    const route = { params: { agentReason: undefined } } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  it('renders with empty object params', () => {
    const route = { params: {} } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.CancelledVerification.Title')).toBeTruthy()
    expect(tree.getByText('BCSC.CancelledVerification.Label')).toBeTruthy()
  })

  it('cleans up verification data on mount', () => {
    const route = { params: { agentReason: 'Test reason' } } as any

    render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(mockCleanUpVerificationData).toHaveBeenCalledTimes(1)
  })

  it('cleans up verification data and resets stack to VerificationMethodSelection on press', () => {
    const route = { params: { agentReason: 'Test reason' } } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    jest.clearAllMocks()
    fireEvent.press(tree.getByText('BCSC.CancelledVerification.Button'))

    expect(mockCleanUpVerificationData).toHaveBeenCalledTimes(1)
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Verify Options' }],
    })
    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('displays OK button', () => {
    const route = { params: { agentReason: 'Test reason' } } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('BCSC.CancelledVerification.Button')).toBeTruthy()
  })
})
