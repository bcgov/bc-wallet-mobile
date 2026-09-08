import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import useServerStatusCheck from './useServerStatusCheck'

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

describe('useServerStatusCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([{} as any, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true } as any)
  })

  it('does not call getServerStatus and reports available when client is not ready', async () => {
    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: false } as any)

    const { result } = renderHook(() => useServerStatusCheck())

    let checkResult
    await act(async () => {
      checkResult = await result.current.checkServerStatus()
    })

    expect(mockGetServerStatus).not.toHaveBeenCalled()
    expect(checkResult).toEqual({ isAvailable: true })
  })

  it('calls onSuccess and reports available when server status is ok', async () => {
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

    const { result } = renderHook(() => useServerStatusCheck())

    let checkResult
    await act(async () => {
      checkResult = await result.current.checkServerStatus()
    })

    expect(mockRunCheck).toHaveBeenCalled()
    expect(mockOnSuccess).toHaveBeenCalled()
    expect(checkResult).toEqual({ isAvailable: true })
  })

  it('calls onFail and reports unavailable with the status message when server status is not ok', async () => {
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

    const { result } = renderHook(() => useServerStatusCheck())

    let checkResult
    await act(async () => {
      checkResult = await result.current.checkServerStatus()
    })

    expect(mockOnFail).toHaveBeenCalled()
    expect(checkResult).toEqual({ isAvailable: false, statusMessage: 'Maintenance' })
  })

  it('logs and reports available when the status request throws', async () => {
    const error = new Error('Network error')
    mockGetServerStatus.mockRejectedValue(error)

    const { result } = renderHook(() => useServerStatusCheck())

    let checkResult
    await act(async () => {
      checkResult = await result.current.checkServerStatus()
    })

    expect(mockLogger.error).toHaveBeenCalledWith('useServerStatusCheck: Failed to check server status', error)
    expect(checkResult).toEqual({ isAvailable: true })
  })
})
