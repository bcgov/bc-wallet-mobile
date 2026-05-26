import { useBCSCAgent } from '@/bcsc-theme/features/agent'
import * as Bifold from '@bifold/core'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Share } from 'react-native'

import QRDisplay from './QRDisplay'

jest.mock('@/bcsc-theme/features/agent', () => ({
  useBCSCAgent: jest.fn(),
}))

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  QRRenderer: jest.fn().mockReturnValue(null),
  useConnectionByOutOfBandId: jest.fn().mockReturnValue(undefined),
}))

jest.mock('./WalletNameDisplay', () => ({
  __esModule: true,
  default: () => null,
}))

const mockUseBCSCAgent = jest.mocked(useBCSCAgent)

const realInvitationUrl = 'didcomm://invite?oob=abc123'

// Stand-in for a credo agent with just the OOB module the view model needs.
const makeAgent = () => {
  const toUrl = jest.fn(() => realInvitationUrl)
  const createInvitation = jest.fn(async () => ({
    id: 'oob-1',
    outOfBandInvitation: { toUrl },
  }))
  const agent = {
    modules: { didcomm: { oob: { createInvitation } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { agent, createInvitation }
}

describe('QRDisplay', () => {
  let mockNavigation: ReturnType<typeof useNavigation>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agentHandle: ReturnType<typeof makeAgent>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    agentHandle = makeAgent()
  })

  const setReadyAgent = () => {
    mockUseBCSCAgent.mockReturnValue({
      agent: agentHandle.agent,
      loading: false,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
    })
  }
  const setNoAgent = () => {
    mockUseBCSCAgent.mockReturnValue({
      agent: null,
      loading: true,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
    })
  }

  const renderComponent = () =>
    render(
      <BasicAppContext>
        <QRDisplay />
      </BasicAppContext>
    )

  it('shows the loading state and does not call createInvitation when the agent is not ready', async () => {
    setNoAgent()

    const { getByTestId } = renderComponent()
    await act(async () => {})

    expect(getByTestId(testIdWithKey('QRDisplay.Loading'))).toBeTruthy()
    expect(agentHandle.createInvitation).not.toHaveBeenCalled()
  })

  it('passes the real invitation URL to QRRenderer once the agent is ready', async () => {
    setReadyAgent()

    renderComponent()

    await waitFor(() => {
      expect(agentHandle.createInvitation).toHaveBeenCalled()
      const calls = jest.mocked(Bifold.QRRenderer).mock.calls
      expect(calls.at(-1)![0]).toMatchObject({ value: realInvitationUrl })
    })
  })

  it('renders the error state and recovers via retry', async () => {
    setReadyAgent()
    agentHandle.createInvitation.mockRejectedValueOnce(new Error('agent boom'))

    const { findByTestId, getByText } = renderComponent()

    const errorBox = await findByTestId(testIdWithKey('QRDisplay.Error'))
    expect(errorBox).toBeTruthy()

    fireEvent.press(getByText('BCSC.QRDisplay.RetryCta'))

    await waitFor(() => {
      expect(agentHandle.createInvitation).toHaveBeenCalledTimes(2)
      const calls = jest.mocked(Bifold.QRRenderer).mock.calls
      expect(calls.at(-1)![0]).toMatchObject({ value: realInvitationUrl })
    })
  })

  it('renders a header share button only when ready and shares the real invitation', async () => {
    setReadyAgent()
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })

    renderComponent()

    await waitFor(() => {
      const setOptionsCalls = jest.mocked(mockNavigation.setOptions).mock.calls
      const latest = setOptionsCalls.at(-1)?.[0]?.headerRight
      expect(latest?.()).not.toBeNull()
    })

    const setOptionsCalls = jest.mocked(mockNavigation.setOptions).mock.calls
    const shareElement = setOptionsCalls.at(-1)![0].headerRight()

    await act(async () => {
      await shareElement.props.onPress()
    })

    expect(shareSpy).toHaveBeenCalledWith({ message: realInvitationUrl })
    shareSpy.mockRestore()
  })

  it('omits the share button while the QR is not ready', async () => {
    setNoAgent()

    renderComponent()
    await act(async () => {})

    const setOptionsCalls = jest.mocked(mockNavigation.setOptions).mock.calls
    const latestHeaderRight = setOptionsCalls.at(-1)![0].headerRight
    expect(latestHeaderRight()).toBeNull()
  })
})
