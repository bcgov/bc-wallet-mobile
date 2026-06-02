import { Agent } from '@credo-ts/core'
import { render } from '@testing-library/react-native'
import React, { PropsWithChildren } from 'react'
import { Text } from 'react-native'

import { useBCSCAgent } from './BCSCAgentProvider'
import BifoldScope from './BifoldScope'

jest.mock('./BCSCAgentProvider', () => ({
  useBCSCAgent: jest.fn(),
}))

const mockAgentProvider = jest.fn(({ children }: PropsWithChildren<{ agent: Agent | undefined }>) => <>{children}</>)

jest.mock('@bifold/core', () => ({
  AgentProvider: (props: PropsWithChildren<{ agent: Agent | undefined }>) => mockAgentProvider(props),
}))

const mockUseBCSCAgent = useBCSCAgent as jest.MockedFunction<typeof useBCSCAgent>

describe('BifoldScope', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('mounts AgentProvider with an undefined agent when not ready', () => {
    mockUseBCSCAgent.mockReturnValue({
      agent: null,
      loading: true,
      error: null,
      retry: jest.fn(),
      resetWallet: jest.fn(),
    })

    const { getByText } = render(
      <BifoldScope>
        <Text>child</Text>
      </BifoldScope>
    )

    expect(getByText('child')).toBeTruthy()
    expect(mockAgentProvider).toHaveBeenCalledWith(expect.objectContaining({ agent: undefined }))
  })

  it('mounts AgentProvider with the live agent when ready', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = {} as Agent
    mockUseBCSCAgent.mockReturnValue({ agent, loading: false, error: null, retry: jest.fn(), resetWallet: jest.fn() })

    const { getByText } = render(
      <BifoldScope>
        <Text>child</Text>
      </BifoldScope>
    )

    expect(getByText('child')).toBeTruthy()
    expect(mockAgentProvider).toHaveBeenCalledWith(expect.objectContaining({ agent }))
  })
})
