import * as Bifold from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Share } from 'react-native'
import QRDisplay from './QRDisplay'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  QRRenderer: jest.fn().mockReturnValue(null),
}))

jest.mock('./WalletNameDisplay', () => ({
  __esModule: true,
  default: () => null,
}))

describe('QRDisplay', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
  })

  const renderComponent = () =>
    render(
      <BasicAppContext>
        <QRDisplay />
      </BasicAppContext>
    )

  it('renders without crashing', async () => {
    const { toJSON } = renderComponent()
    await act(async () => {})
    expect(toJSON()).toBeTruthy()
  })

  it('passes the placeholder invitation URL to QRRenderer', async () => {
    renderComponent()
    await waitFor(() => {
      const calls = jest.mocked(Bifold.QRRenderer).mock.calls
      expect(calls.at(-1)![0]).toMatchObject({ value: 'https://example.com/invitation' })
    })
  })

  it('configures the navigation header with a share button', async () => {
    renderComponent()
    await act(async () => {})
    expect(mockNavigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ headerRight: expect.any(Function) })
    )
  })

  it('calls Share.share with the invitation when share is triggered', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })

    renderComponent()
    await act(async () => {})

    // The last setOptions call has the invitation in scope (after state update)
    const lastCall = jest.mocked(mockNavigation.setOptions).mock.calls.at(-1)!
    const shareButtonElement = lastCall[0].headerRight()

    await act(async () => {
      await shareButtonElement.props.onPress()
    })

    expect(shareSpy).toHaveBeenCalledWith({ message: 'https://example.com/invitation' })
    shareSpy.mockRestore()
  })
})
