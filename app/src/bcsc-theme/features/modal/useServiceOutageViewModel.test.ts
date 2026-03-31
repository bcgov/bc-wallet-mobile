import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { HELP_URL } from '@/constants'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { openLink } from '@/utils/links'
import * as Bifold from '@bifold/core'
import { useRoute } from '@react-navigation/native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import useServiceOutageViewModel from './useServiceOutageViewModel'

jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
}))

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
const mockUseBCSCApiClientState = jest.mocked(useBCSCApiClientState)

const mockGetServerStatus = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useConfigApi', () => () => ({
  getServerStatus: mockGetServerStatus,
}))

jest.mock('@/services/system-checks/ServerStatusSystemCheck')
const MockServerStatusSystemCheck = jest.mocked(ServerStatusSystemCheck)

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const mockDispatch = jest.fn()

describe('useServiceOutageViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([{} as any, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true } as any)

    jest
      .mocked(useRoute)
      .mockReturnValue({ params: { statusMessage: 'Server is down' }, key: 'test', name: 'ServiceOutage' as any })
  })

  it('returns localized text fields', () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.headerText).toBe('BCSC.Modals.ServiceOutage.Header')
    expect(result.current.buttonText).toBe('BCSC.Modals.ServiceOutage.CheckAgainButton')
    expect(result.current.learnMoreText).toBe('BCSC.Modals.ServiceOutage.LearnMore')
  })

  it('uses route statusMessage for contentText', () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.contentText).toEqual(['Server is down'])
  })

  it('falls back to translation key when no statusMessage in route', () => {
    jest.mocked(useRoute).mockReturnValue({ params: {}, key: 'test', name: 'ServiceOutage' as any })

    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.contentText).toEqual(['BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'])
  })

  it('isCheckDisabled is false when client is ready and not checking', () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.isCheckDisabled).toBe(false)
  })

  it('isCheckDisabled is true when client is not ready', () => {
    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: false } as any)

    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.isCheckDisabled).toBe(true)
  })

  it('handleLearnMore calls openLink with HELP_URL', () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    result.current.handleLearnMore()

    expect(openLink).toHaveBeenCalledWith(HELP_URL)
  })

  it('handleCheckAgain does nothing when client is not ready', async () => {
    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: false } as any)

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockGetServerStatus).not.toHaveBeenCalled()
  })

  it('handleCheckAgain calls onSuccess when server status is ok', async () => {
    const mockOnSuccess = jest.fn()
    const mockRunCheck = jest.fn().mockReturnValue(true)

    MockServerStatusSystemCheck.mockImplementation(
      () =>
        ({
          runCheck: mockRunCheck,
          onSuccess: mockOnSuccess,
          onFail: jest.fn(),
        }) as any
    )

    mockGetServerStatus.mockResolvedValue({ status: 'ok', statusMessage: undefined })

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockRunCheck).toHaveBeenCalled()
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('handleCheckAgain calls onFail when server status is not ok', async () => {
    const mockOnFail = jest.fn()
    const mockRunCheck = jest.fn().mockReturnValue(false)

    MockServerStatusSystemCheck.mockImplementation(
      () =>
        ({
          runCheck: mockRunCheck,
          onSuccess: jest.fn(),
          onFail: mockOnFail,
        }) as any
    )

    mockGetServerStatus.mockResolvedValue({ status: 'unavailable', statusMessage: 'Maintenance' })

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockOnFail).toHaveBeenCalled()
  })

  it('handleCheckAgain logs error on failure', async () => {
    const error = new Error('Network error')
    mockGetServerStatus.mockRejectedValue(error)

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockLogger.error).toHaveBeenCalledWith('ServiceOutage: Failed to re-check server status', error)
  })

  it('handleCheckAgain sets isCheckDisabled during check', async () => {
    let resolveStatus: (value: any) => void
    mockGetServerStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve
      })
    )

    const mockRunCheck = jest.fn().mockReturnValue(true)
    MockServerStatusSystemCheck.mockImplementation(
      () =>
        ({
          runCheck: mockRunCheck,
          onSuccess: jest.fn(),
          onFail: jest.fn(),
        }) as any
    )

    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.isCheckDisabled).toBe(false)

    let checkPromise: Promise<void>
    act(() => {
      checkPromise = result.current.handleCheckAgain()
    })

    await waitFor(() => {
      expect(result.current.isCheckDisabled).toBe(true)
    })

    await act(async () => {
      resolveStatus!({ status: 'ok' })
      await checkPromise!
    })

    expect(result.current.isCheckDisabled).toBe(false)
  })
})
