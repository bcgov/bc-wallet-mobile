import { AppError, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import * as agentService from './services/agent-service'
import useAgentSetupViewModel from './useAgentSetupViewModel'

jest.mock('@bifold/core')
jest.mock('@/utils/PushNotificationsHelper', () => ({ activate: jest.fn().mockResolvedValue(undefined) }))
jest.mock('react-native-config', () => ({ Config: { INDY_VDR_PROXY_URL: '' } }))
jest.mock('@credo-ts/core', () => {
  const actual = jest.requireActual('@credo-ts/core')
  return {
    ...actual,
    MediatorPickupStrategy: { PickUpV2LiveMode: 'PickUpV2LiveMode' },
  }
})
jest.mock('./services/agent-service')

const mockedStore = (overrides: Record<string, unknown> = {}) => {
  const base = {
    authentication: { didAuthenticate: true },
    bcscSecure: { walletKey: 'wallet-key-hash' },
    preferences: { selectedMediator: 'https://mediator.example', walletName: 'BC Wallet', usePushNotifications: false },
    developer: { enableProxy: false },
    migration: { didMigrateToAskar: true },
    ...overrides,
  }
  return [base, jest.fn()]
}

const mockAgent = () =>
  ({
    mediationRecipient: { initiateMessagePickup: jest.fn().mockResolvedValue(undefined) },
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), trace: jest.fn() }
const attestationMonitor = { start: jest.fn(), stop: jest.fn() }

describe('useAgentSetupViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useServices).mockReturnValue([logger, [], attestationMonitor, [], []] as never)
    jest.mocked(Bifold.useStore).mockReturnValue(mockedStore() as never)
    jest.mocked(Bifold.createLinkSecretIfRequired).mockResolvedValue(undefined as never)
    jest.mocked(agentService.loadCachedLedgers).mockResolvedValue(undefined)
    jest.mocked(agentService.buildAgent).mockReturnValue(mockAgent())
    jest.mocked(agentService.restartAgent).mockResolvedValue(undefined)
    jest.mocked(agentService.warmCache).mockResolvedValue(undefined)
    jest.mocked(agentService.shutdownAgent).mockResolvedValue(undefined)
  })

  it('happy path: builds agent and reaches ready status', async () => {
    const { result } = renderHook(() => useAgentSetupViewModel())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.agent).not.toBeNull()
    expect(result.current.error).toBeNull()
    expect(agentService.buildAgent).toHaveBeenCalled()
    expect(agentService.warmCache).toHaveBeenCalled()
  })

  it('missing walletKey yields 2902 WALLET_SECRET_NOT_FOUND error', async () => {
    jest.mocked(Bifold.useStore).mockReturnValue(mockedStore({ bcscSecure: { walletKey: undefined } }) as never)

    const { result } = renderHook(() => useAgentSetupViewModel())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeInstanceOf(AppError)
    expect(result.current.error?.statusCode).toBe(2902)
    expect(result.current.error?.appEvent).toBe(AppEventCode.WALLET_SECRET_NOT_FOUND)
    expect(agentService.buildAgent).not.toHaveBeenCalled()
  })

  it('wraps non-AppError throws in 2901 AGENT_INITIALIZATION_ERROR', async () => {
    jest.mocked(agentService.buildAgent).mockImplementationOnce(() => {
      throw new Error('mediator unreachable')
    })

    const { result } = renderHook(() => useAgentSetupViewModel())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.statusCode).toBe(2901)
    expect(result.current.error?.appEvent).toBe(AppEventCode.AGENT_INITIALIZATION_ERROR)
    expect(result.current.error?.cause).toBeInstanceOf(Error)
  })

  it('preserves AppError thrown by service (does not re-wrap)', async () => {
    const thrownAppError = AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR, {
      cause: new Error('Mediator URL is required to build agent'),
    })
    jest.mocked(agentService.buildAgent).mockImplementationOnce(() => {
      throw thrownAppError
    })

    const { result } = renderHook(() => useAgentSetupViewModel())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(thrownAppError)
  })

  it('retry resets status to initializing and re-runs init', async () => {
    jest.mocked(agentService.buildAgent).mockImplementationOnce(() => {
      throw new Error('first attempt fails')
    })

    const { result } = renderHook(() => useAgentSetupViewModel())
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(agentService.buildAgent).toHaveBeenCalledTimes(2)
  })

  it('shuts down agent when didAuthenticate flips to false', async () => {
    const store: Record<string, unknown> = {
      authentication: { didAuthenticate: true },
      bcscSecure: { walletKey: 'wallet-key-hash' },
      preferences: { selectedMediator: 'https://m', walletName: 'BC Wallet', usePushNotifications: false },
      developer: { enableProxy: false },
      migration: { didMigrateToAskar: true },
    }
    jest.mocked(Bifold.useStore).mockImplementation(() => [store as never, jest.fn()])

    const { result, rerender } = renderHook(() => useAgentSetupViewModel())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Flip to unauthenticated
    ;(store.authentication as Record<string, unknown>).didAuthenticate = false
    rerender({})

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(agentService.shutdownAgent).toHaveBeenCalled()
    expect(result.current.agent).toBeNull()
  })
})
