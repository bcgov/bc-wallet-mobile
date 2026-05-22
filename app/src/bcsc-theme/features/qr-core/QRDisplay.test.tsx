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
  createConnectionInvitation: jest.fn(),
}))

jest.mock('./WalletNameDisplay', () => ({
  __esModule: true,
  default: () => null,
}))

const mockUseBCSCAgent = jest.mocked(useBCSCAgent)
const mockCreateInvitation = jest.mocked(Bifold.createConnectionInvitation)

const realInvitationUrl = 'https://realhost.example/invitation?oob=abc123'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeAgent = {} as any

const readyAgentReturn = { agent: fakeAgent, loading: false, error: null, retry: jest.fn(), resetWallet: jest.fn() }
const noAgentReturn = { agent: null, loading: true, error: null, retry: jest.fn(), resetWallet: jest.fn() }

describe('QRDisplay', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    mockCreateInvitation.mockResolvedValue({
      invitationUrl: realInvitationUrl,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })
  })

  const renderComponent = () =>
    render(
      <BasicAppContext>
        <QRDisplay />
      </BasicAppContext>
    )

  it('shows the loading state and does not call createConnectionInvitation when the agent is not ready', async () => {
    mockUseBCSCAgent.mockReturnValue(noAgentReturn)

    const { getByTestId } = renderComponent()
    await act(async () => {})

    expect(getByTestId(testIdWithKey('QRDisplay.Loading'))).toBeTruthy()
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('passes the real invitation URL to QRRenderer once the agent is ready', async () => {
    mockUseBCSCAgent.mockReturnValue(readyAgentReturn)

    renderComponent()

    await waitFor(() => {
      expect(mockCreateInvitation).toHaveBeenCalledWith(fakeAgent)
      const calls = jest.mocked(Bifold.QRRenderer).mock.calls
      expect(calls.at(-1)![0]).toMatchObject({ value: realInvitationUrl })
    })
  })

  it('renders the error state and recovers via retry', async () => {
    mockUseBCSCAgent.mockReturnValue(readyAgentReturn)
    mockCreateInvitation.mockRejectedValueOnce(new Error('agent boom'))

    const { findByTestId, getByText } = renderComponent()

    const errorBox = await findByTestId(testIdWithKey('QRDisplay.Error'))
    expect(errorBox).toBeTruthy()

    fireEvent.press(getByText('BCSC.QRDisplay.RetryCta'))

    await waitFor(() => {
      expect(mockCreateInvitation).toHaveBeenCalledTimes(2)
      const calls = jest.mocked(Bifold.QRRenderer).mock.calls
      expect(calls.at(-1)![0]).toMatchObject({ value: realInvitationUrl })
    })
  })

  it('renders a header share button only when ready and shares the real invitation', async () => {
    mockUseBCSCAgent.mockReturnValue(readyAgentReturn)
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
    mockUseBCSCAgent.mockReturnValue(noAgentReturn)

    renderComponent()
    await act(async () => {})

    const setOptionsCalls = jest.mocked(mockNavigation.setOptions).mock.calls
    const latestHeaderRight = setOptionsCalls.at(-1)![0].headerRight
    expect(latestHeaderRight()).toBeNull()
  })
})
