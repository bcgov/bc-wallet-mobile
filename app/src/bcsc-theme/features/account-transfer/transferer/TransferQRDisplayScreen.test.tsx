import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { getAccount } from 'react-native-bcsc-core'
import TransferQRDisplayScreen from './TransferQRDisplayScreen'

const mockAccountNotFoundAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    accountNotFoundAlert: mockAccountNotFoundAlert,
  }),
}))

describe('TransferQRDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows account not found alert when getAccount returns null', async () => {
    jest.mocked(getAccount).mockResolvedValueOnce(null)

    render(
      <BasicAppContext>
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(mockAccountNotFoundAlert).toHaveBeenCalled()
    })
  })
})
