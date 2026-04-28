import { AppError, ErrorRegistry } from '@/errors'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import BCSCAgentProvider, { useBCSCAgent } from './BCSCAgentProvider'
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
jest.mock('@bifold/core', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    AgentProvider: ({ children }: { children: React.ReactNode }) => (
      <>
        <Text>bifold-agent-provider</Text>
        {children}
      </>
    ),
  }
})

const mockViewModel = useAgentSetupViewModel as jest.MockedFunction<typeof useAgentSetupViewModel>

const StatusProbe: React.FC = () => {
  const { status, agent, error } = useBCSCAgent()
  return <Text>{`status=${status} hasAgent=${agent !== null} hasError=${error !== null}`}</Text>
}

describe('BCSCAgentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders LoadingScreen while initializing', () => {
    mockViewModel.mockReturnValue({ agent: null, status: 'initializing', error: null, retry: jest.fn() })

    const { getByText, queryByText } = render(
      <BCSCAgentProvider>
        <Text>hidden</Text>
      </BCSCAgentProvider>
    )

    expect(getByText('Init.InitializingAgent')).toBeTruthy()
    expect(queryByText('bifold-agent-provider')).toBeNull()
  })

  it('wraps children in Bifold AgentProvider and exposes agent via BCSC context when ready', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = {} as any
    mockViewModel.mockReturnValue({ agent, status: 'ready', error: null, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <StatusProbe />
      </BCSCAgentProvider>
    )

    expect(getByText('bifold-agent-provider')).toBeTruthy()
    expect(getByText('status=ready hasAgent=true hasError=false')).toBeTruthy()
  })

  it('renders children inside BCSC context but skips Bifold AgentProvider when init fails', () => {
    const error = AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR)
    mockViewModel.mockReturnValue({ agent: null, status: 'error', error, retry: jest.fn() })

    const { getByText, queryByText } = render(
      <BCSCAgentProvider>
        <StatusProbe />
      </BCSCAgentProvider>
    )

    expect(getByText('status=error hasAgent=false hasError=true')).toBeTruthy()
    expect(queryByText('bifold-agent-provider')).toBeNull()
  })

  it('useBCSCAgent throws when called outside the provider', () => {
    // suppress expected console.error from React rendering the throw
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<StatusProbe />)).toThrow('useBCSCAgent must be used within a BCSCAgentProvider')
    consoleSpy.mockRestore()
  })
})
