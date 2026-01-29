import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import CancelledReview from './CancelledReview'

describe('CancelledReview', () => {
  let mockNavigation: any
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockNavigation = useNavigation()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly with agent reason', () => {
    const agentReason = 'Face does not match ID document'
    const route = {
      params: {
        agentReason,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
    expect(tree.getByText("Your identity couldn't be verified")).toBeTruthy()
    expect(tree.getByText(/Face does not match ID document/)).toBeTruthy()
  })

  it('renders with default message when no agent reason provided', () => {
    const route = {
      params: {
        agentReason: undefined,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText("Your identity couldn't be verified")).toBeTruthy()
    expect(tree.getByText(/No reason provided/)).toBeTruthy()
  })

  it('renders with empty object params', () => {
    const route = {
      params: {},
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText("Your identity couldn't be verified")).toBeTruthy()
    expect(tree.getByText(/No reason provided/)).toBeTruthy()
  })

  it('navigates back when OK button is pressed', async () => {
    const agentReason = 'Test reason'
    const route = {
      params: {
        agentReason,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )
    await waitFor(() => {
      const okButton = tree.getByText('OK')
      expect(okButton).toBeTruthy()
    })

    const okButton = tree.getByText('OK')
    fireEvent.press(okButton)

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1)
    })
  })

  it('displays OK button', () => {
    const route = {
      params: {
        agentReason: 'Test reason',
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )

    expect(tree.getByText('OK')).toBeTruthy()
  })

  it('renders SystemModal component', () => {
    const agentReason = 'Test reason'
    const route = {
      params: {
        agentReason,
      },
    } as any

    const tree = render(
      <BasicAppContext>
        <CancelledReview navigation={mockNavigation} route={route} />
      </BasicAppContext>
    )

    // SystemModal should render with the header text
    expect(tree.getByText("Your identity couldn't be verified")).toBeTruthy()
  })
})
