import { AppError, ErrorRegistry } from '@/errors'
import { render } from '@testing-library/react-native'
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
}))

const mockViewModel = useAgentSetupViewModel as jest.MockedFunction<typeof useAgentSetupViewModel>

describe('BCSCAgentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  it('renders children without AgentProvider when init fails (non-blocking)', () => {
    const error = AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR)
    mockViewModel.mockReturnValue({ agent: null, status: 'error', error, retry: jest.fn() })

    const { getByText, queryByText } = render(
      <BCSCAgentProvider>
        <Text>home-screen</Text>
      </BCSCAgentProvider>
    )

    expect(getByText('home-screen')).toBeTruthy()
    expect(queryByText('Init.InitializingAgent')).toBeNull()
  })
})
