import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { act, renderHook } from '@testing-library/react-native'
import useServiceOutageViewModel from './useServiceOutageViewModel'

const mockRefresh = jest.fn()
let mockServerStatus: ReturnType<typeof makeServerStatus>

const makeServerStatus = (overrides: Record<string, unknown> = {}) => ({
  isAvailable: false,
  statusMessage: 'Server is down' as string | undefined,
  contactLink: undefined,
  serverStatus: null,
  isChecking: false,
  hasChecked: true,
  refresh: mockRefresh,
  ...overrides,
})

jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockServerStatus,
}))

describe('useServiceOutageViewModel', () => {
  let mockNavigation: ReturnType<typeof useNavigation> & {
    getState: jest.Mock
    canGoBack: jest.Mock
    goBack: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation() as never
    mockNavigation.getState = jest.fn().mockReturnValue({ routes: [{ name: BCSCModals.ServiceOutage }], index: 0 })
    mockNavigation.canGoBack = jest.fn().mockReturnValue(true)
    mockRefresh.mockResolvedValue({ isAvailable: true, serverStatus: null })
    mockServerStatus = makeServerStatus()
  })

  it('returns localized text and the status message as content', () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.headerText).toBe('BCSC.Modals.ServiceOutage.Header')
    expect(result.current.buttonText).toBe('BCSC.Modals.ServiceOutage.CheckAgainButton')
    expect(result.current.skipVerificationText).toBe('BCSC.VerifyPrompt.SkipVerification')
    expect(result.current.contentText).toEqual(['Server is down'])
  })

  it('falls back to a translation key when there is no status message', () => {
    mockServerStatus = makeServerStatus({ statusMessage: undefined })

    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.contentText).toEqual(['BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'])
  })

  it('reflects isAvailable and isChecking from the provider', () => {
    mockServerStatus = makeServerStatus({ isChecking: true })

    const { result } = renderHook(() => useServiceOutageViewModel())

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.isCheckDisabled).toBe(true)
  })

  it('handleCheckAgain force-refreshes and dismisses the modal on recovery', async () => {
    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockRefresh).toHaveBeenCalledWith({ force: true })
    expect(mockNavigation.goBack).toHaveBeenCalled()
  })

  it('handleCheckAgain stays put when the server is still unavailable', async () => {
    mockRefresh.mockResolvedValue({ isAvailable: false, serverStatus: null })

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })

  it('handleCheckAgain does not go back when rendered inline (not the modal route)', async () => {
    mockNavigation.getState = jest.fn().mockReturnValue({ routes: [{ name: 'VerifyPrompt' }], index: 0 })

    const { result } = renderHook(() => useServiceOutageViewModel())

    await act(async () => {
      await result.current.handleCheckAgain()
    })

    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })
})
