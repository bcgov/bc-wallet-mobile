import { Agent } from '@credo-ts/core'
import { render } from '@testing-library/react-native'
import React, { PropsWithChildren } from 'react'
import { Text } from 'react-native'

import BifoldScope from './BifoldScope'
import { useBCSCAgent } from './BCSCAgentProvider'

jest.mock('./BCSCAgentProvider', () => ({
  useBCSCAgent: jest.fn(),
}))

const mockAgentProvider = jest.fn(({ children }: PropsWithChildren<{ agent: Agent }>) => <>{children}</>)
const mockOpenIDProvider = jest.fn(({ children }: PropsWithChildren) => <>{children}</>)

jest.mock('@bifold/core', () => ({
  AgentProvider: (props: PropsWithChildren<{ agent: Agent }>) => mockAgentProvider(props),
  OpenIDCredentialRecordProvider: (props: PropsWithChildren) => mockOpenIDProvider(props),
}))

const mockUseBCSCAgent = useBCSCAgent as jest.MockedFunction<typeof useBCSCAgent>

describe('BifoldScope', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children without Bifold providers when the agent is not ready', () => {
    mockUseBCSCAgent.mockReturnValue({ agent: null, loading: true, error: null, retry: jest.fn() })

    const { getByText } = render(
      <BifoldScope>
        <Text>child</Text>
      </BifoldScope>
    )

    expect(getByText('child')).toBeTruthy()
    expect(mockAgentProvider).not.toHaveBeenCalled()
    expect(mockOpenIDProvider).not.toHaveBeenCalled()
  })

  it('wraps children in Bifold providers using the live agent when ready', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = {} as Agent
    mockUseBCSCAgent.mockReturnValue({ agent, loading: false, error: null, retry: jest.fn() })

    const { getByText } = render(
      <BifoldScope>
        <Text>child</Text>
      </BifoldScope>
    )

    expect(getByText('child')).toBeTruthy()
    expect(mockAgentProvider).toHaveBeenCalledWith(expect.objectContaining({ agent }))
    expect(mockOpenIDProvider).toHaveBeenCalled()
  })
})
