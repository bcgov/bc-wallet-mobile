import * as ErrorAlertContext from '@/contexts/ErrorAlertContext'
import { AppError, ErrorRegistry } from '@/errors'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import BCSCAgentProvider from './BCSCAgentProvider'
import useAgentSetupViewModel from './useAgentSetupViewModel'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock('./useAgentSetupViewModel', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('../../contexts/BCSCLoadingContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    LoadingScreen: ({ message }: { message: string }) => <Text>{message}</Text>,
  }
})
jest.mock('@bifold/core', () => ({
  AgentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OpenIDCredentialRecordProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: jest.fn(),
}))

const mockViewModel = useAgentSetupViewModel as jest.MockedFunction<typeof useAgentSetupViewModel>

describe('BCSCAgentProvider', () => {
  const emitErrorModal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(ErrorAlertContext, 'useErrorAlert').mockReturnValue({ emitErrorModal, emitAlert: jest.fn() })
  })

  it('renders LoadingScreen while initializing', () => {
    mockViewModel.mockReturnValue({ agent: null, status: 'initializing', error: null, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <Text>hidden</Text>
      </BCSCAgentProvider>
    )

    expect(getByText('Init.InitializingAgent')).toBeTruthy()
  })

  it('renders children wrapped in AgentProvider when ready', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = {} as any
    mockViewModel.mockReturnValue({ agent, status: 'ready', error: null, retry: jest.fn() })

    const { getByText, queryByText } = render(
      <BCSCAgentProvider>
        <Text>home-screen</Text>
      </BCSCAgentProvider>
    )

    expect(getByText('home-screen')).toBeTruthy()
    expect(queryByText('Init.InitializingAgent')).toBeNull()
  })

  it('calls emitErrorModal once per error transition with retry action', async () => {
    const retry = jest.fn()
    const error = AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR)
    mockViewModel.mockReturnValue({ agent: null, status: 'error', error, retry })

    const { rerender } = render(
      <BCSCAgentProvider>
        <Text>hidden</Text>
      </BCSCAgentProvider>
    )

    await waitFor(() => expect(emitErrorModal).toHaveBeenCalledTimes(1))
    expect(emitErrorModal).toHaveBeenCalledWith(
      'Error.Title2901',
      'Error.Message2901',
      error,
      expect.objectContaining({
        action: expect.objectContaining({ text: 'Init.Retry', onPress: retry }),
      })
    )

    // Re-render with same error — should not emit again
    rerender(
      <BCSCAgentProvider>
        <Text>hidden</Text>
      </BCSCAgentProvider>
    )
    expect(emitErrorModal).toHaveBeenCalledTimes(1)
  })

  it('emits modal with 2902 strings when walletKey is missing', async () => {
    const error = AppError.fromErrorDefinition(ErrorRegistry.WALLET_SECRET_NOT_FOUND)
    mockViewModel.mockReturnValue({ agent: null, status: 'error', error, retry: jest.fn() })

    render(
      <BCSCAgentProvider>
        <Text>hidden</Text>
      </BCSCAgentProvider>
    )

    await waitFor(() => expect(emitErrorModal).toHaveBeenCalledTimes(1))
    expect(emitErrorModal).toHaveBeenCalledWith('Error.Title2902', 'Error.Message2902', error, expect.anything())
  })
})
