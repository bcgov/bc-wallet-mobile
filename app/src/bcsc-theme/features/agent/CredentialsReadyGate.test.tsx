/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ReactNavigationNative from '@react-navigation/native'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import { useBCSCAgent } from './BCSCAgentProvider'
import CredentialsReadyGate from './CredentialsReadyGate'

const mockUseCredentials = jest.fn()
const mockSkeletonMounted = jest.fn()
const mockSkeletonProps = jest.fn()

jest.mock('./BCSCAgentProvider', () => ({
  useBCSCAgent: jest.fn(),
}))

jest.mock('@bifold/react-hooks', () => ({
  useCredentials: () => mockUseCredentials(),
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
    useTheme: () => ({ Spacing: { lg: 16 } }),
  }
})

jest.mock('@/bcsc-theme/components/CredentialListSkeleton', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  const Skeleton = (props: any) => {
    ReactInFactory.useEffect(() => {
      mockSkeletonMounted()
    }, [])
    mockSkeletonProps(props)
    return ReactInFactory.createElement('View', { testID: props.testID })
  }
  return { __esModule: true, default: Skeleton }
})

const mockUseBCSCAgent = useBCSCAgent as jest.MockedFunction<typeof useBCSCAgent>

const READY_AGENT = {} as any

const agentValue = (overrides: any = {}) => ({
  agent: null,
  loading: false,
  error: null,
  retry: jest.fn(),
  resetWallet: jest.fn(),
  ...overrides,
})

const Gate = () => (
  <CredentialsReadyGate testID="gate">
    <Text>child</Text>
  </CredentialsReadyGate>
)

describe('CredentialsReadyGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => jest.restoreAllMocks())

  it('shows the skeleton while the agent is starting', () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ loading: true }))
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })

    render(<Gate />)

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(mockSkeletonMounted).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('child')).toBeNull()
    expect(screen.queryByText('Init.Failed')).toBeNull()
  })

  it('keeps showing the skeleton while credentials load once the agent is ready', () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ agent: READY_AGENT }))
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })

    render(<Gate />)

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(mockSkeletonMounted).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('child')).toBeNull()
  })

  it('keeps one skeleton from agent start-up through the credential load, then hands over to children', () => {
    // A second skeleton would restart the pulse for the few frames the credential load takes.
    mockUseBCSCAgent.mockReturnValue(agentValue({ loading: true }))
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })
    const view = render(<Gate />)

    mockUseBCSCAgent.mockReturnValue(agentValue({ agent: READY_AGENT }))
    view.rerender(<Gate />)

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(mockSkeletonMounted).toHaveBeenCalledTimes(1)

    mockUseCredentials.mockReturnValue({ loading: false, records: [] })
    view.rerender(<Gate />)

    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByTestId('gate')).toBeNull()
  })

  it('renders children once the agent is ready and credentials have loaded', () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ agent: READY_AGENT }))
    mockUseCredentials.mockReturnValue({ loading: false, records: [] })

    render(<Gate />)

    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByTestId('gate')).toBeNull()
    expect(mockSkeletonMounted).not.toHaveBeenCalled()
  })

  it('shows the failure message with a working retry, not the skeleton, when the agent fails to start', () => {
    const retry = jest.fn()
    mockUseBCSCAgent.mockReturnValue(agentValue({ error: { message: 'boom' } as any, retry }))
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })

    render(<Gate />)

    expect(screen.getByText('Init.Failed')).toBeTruthy()
    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(mockSkeletonMounted).not.toHaveBeenCalled()
    expect(screen.queryByText('child')).toBeNull()

    fireEvent.press(screen.getByTestId('id/AgentRetry'))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('never renders children without an agent, even while credentials still read as loaded', () => {
    // The credential records follow the agent one render late, and the children need the agent.
    mockUseBCSCAgent.mockReturnValue(agentValue())
    mockUseCredentials.mockReturnValue({ loading: false, records: [] })

    render(<Gate />)

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(screen.queryByText('child')).toBeNull()
  })

  it("stops the skeleton's pulse while the tab is not focused", () => {
    mockUseBCSCAgent.mockReturnValue(agentValue({ loading: true }))
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })
    const view = render(<Gate />)
    expect(mockSkeletonProps.mock.lastCall?.[0]).toMatchObject({ active: true })

    jest.spyOn(ReactNavigationNative, 'useIsFocused').mockReturnValue(false)
    view.rerender(<Gate />)

    expect(mockSkeletonProps.mock.lastCall?.[0]).toMatchObject({ active: false })
    expect(mockSkeletonMounted).toHaveBeenCalledTimes(1)
  })
})
