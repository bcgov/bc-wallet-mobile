/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import AgentReadyGate from './AgentReadyGate'
import { useBCSCAgent } from './BCSCAgentProvider'

jest.mock('./BCSCAgentProvider', () => ({
  useBCSCAgent: jest.fn(),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('@bifold/core', () => {
  // Jest forbids referencing out-of-scope identifiers in a mock factory, so
  // re-require React here instead of relying on the top-level import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    Button: ({ title, onPress, testID }: any) =>
      ReactInFactory.createElement('Pressable', { testID, onPress }, ReactInFactory.createElement('Text', null, title)),
    ButtonType: { Primary: 'Primary' },
    ThemedText: ({ children }: any) => ReactInFactory.createElement('Text', null, children),
    testIdWithKey: (key: string) => `id/${key}`,
    useTheme: () => ({
      ColorPalette: { brand: { primary: '#000' } },
      Spacing: { lg: 16 },
    }),
  }
})

const mockUseBCSCAgent = useBCSCAgent as jest.MockedFunction<typeof useBCSCAgent>

const agentValue = (overrides: any = {}) => ({
  agent: null,
  loading: false,
  error: null,
  retry: jest.fn(),
  resetWallet: jest.fn(),
  ...overrides,
})

describe('AgentReadyGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children once the agent is ready', () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ agent: {} as any }))

    render(
      <AgentReadyGate testID="gate">
        <Text>child</Text>
      </AgentReadyGate>
    )

    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByTestId('id/AgentRetry')).toBeNull()
  })

  it('shows a loading indicator while the agent is still initializing', () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ loading: true }))

    render(
      <AgentReadyGate testID="gate">
        <Text>child</Text>
      </AgentReadyGate>
    )

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(screen.queryByText('child')).toBeNull()
    expect(screen.queryByText('Init.Failed')).toBeNull()
    expect(screen.queryByTestId('id/AgentRetry')).toBeNull()
  })

  it('shows a failure message with a working retry when initialization errors', () => {
    const retry = jest.fn()
    mockUseBCSCAgent.mockReturnValue(agentValue({ error: { message: 'boom' } as any, retry }))

    render(
      <AgentReadyGate testID="gate">
        <Text>child</Text>
      </AgentReadyGate>
    )

    expect(screen.getByText('Init.Failed')).toBeTruthy()
    expect(screen.queryByText('child')).toBeNull()

    fireEvent.press(screen.getByTestId('id/AgentRetry'))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
