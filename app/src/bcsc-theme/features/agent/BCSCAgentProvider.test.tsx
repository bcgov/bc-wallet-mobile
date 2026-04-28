import { AppError, ErrorRegistry } from '@/errors'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import BCSCAgentProvider, { useBCSCAgent } from './BCSCAgentProvider'
import useAgentSetupViewModel from './useAgentSetupViewModel'

jest.mock('./useAgentSetupViewModel', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockViewModel = useAgentSetupViewModel as jest.MockedFunction<typeof useAgentSetupViewModel>

const Probe: React.FC = () => {
  const { agent, loading, error } = useBCSCAgent()
  return <Text>{`loading=${loading} hasAgent=${agent !== null} hasError=${error !== null}`}</Text>
}

describe('BCSCAgentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exposes loading=true while idle', () => {
    mockViewModel.mockReturnValue({ agent: null, status: 'idle', error: null, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <Probe />
      </BCSCAgentProvider>
    )

    expect(getByText('loading=true hasAgent=false hasError=false')).toBeTruthy()
  })

  it('exposes loading=true while initializing', () => {
    mockViewModel.mockReturnValue({ agent: null, status: 'initializing', error: null, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <Probe />
      </BCSCAgentProvider>
    )

    expect(getByText('loading=true hasAgent=false hasError=false')).toBeTruthy()
  })

  it('exposes the agent and loading=false when ready', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = {} as any
    mockViewModel.mockReturnValue({ agent, status: 'ready', error: null, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <Probe />
      </BCSCAgentProvider>
    )

    expect(getByText('loading=false hasAgent=true hasError=false')).toBeTruthy()
  })

  it('exposes the error and loading=false when init fails', () => {
    const error = AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR)
    mockViewModel.mockReturnValue({ agent: null, status: 'error', error, retry: jest.fn() })

    const { getByText } = render(
      <BCSCAgentProvider>
        <Probe />
      </BCSCAgentProvider>
    )

    expect(getByText('loading=false hasAgent=false hasError=true')).toBeTruthy()
  })

  it('useBCSCAgent throws when called outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('useBCSCAgent must be used within a BCSCAgentProvider')
    consoleSpy.mockRestore()
  })
})
