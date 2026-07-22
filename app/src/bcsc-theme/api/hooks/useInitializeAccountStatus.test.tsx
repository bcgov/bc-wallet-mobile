import * as retryModule from '@/bcsc-theme/utils/retry'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { getAccount } from 'react-native-bcsc-core'
import { useInitializeAccountStatus } from './useInitializeAccountStatus'

jest.mock('react-native-bcsc-core', () => ({
  getAccount: jest.fn(),
}))

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/utils/retry')

describe('useInitializeAccountStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns initializingAccount as true when stateLoaded and hasAccount is false', () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue(null)

    const { result } = renderHook(() => useInitializeAccountStatus())

    expect(result.current.initializingAccount).toBe(true)
  })

  it('returns initializingAccount as false when stateLoaded is false', () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: false, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const { result } = renderHook(() => useInitializeAccountStatus())

    expect(result.current.initializingAccount).toBe(false)
  })

  it('returns initializingAccount as false when hasAccount is already true and nickname is present', () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([
        { stateLoaded: true, bcsc: { hasAccount: true, selectedNickname: 'Combo' } } as any,
        mockDispatch,
      ])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const { result } = renderHook(() => useInitializeAccountStatus())

    expect(result.current.initializingAccount).toBe(false)
  })

  it('skips native call when store.bcsc.hasAccount is true and nickname is present', async () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([
        { stateLoaded: true, bcsc: { hasAccount: true, selectedNickname: 'Combo' } } as any,
        mockDispatch,
      ])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const { result } = renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(result.current.initializingAccount).toBe(false)
    expect(jest.mocked(retryModule.retryAsync)).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('does not run when stateLoaded is false', async () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: false, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue({ nickname: 'test' })

    renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(jest.mocked(retryModule.retryAsync)).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches SET_HAS_ACCOUNT with true and UPDATE_NICKNAME when account is found with a nickname', async () => {
    const mockDispatch = jest.fn()
    const mockAccount = { nickname: 'My Wallet' }
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue(mockAccount)

    const { result } = renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(jest.mocked(retryModule.retryAsync)).toHaveBeenCalledWith(getAccount, 3, 500, true)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.SET_HAS_ACCOUNT,
      payload: [true],
    })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.UPDATE_NICKNAME,
      payload: ['My Wallet'],
    })
    expect(result.current.initializingAccount).toBe(false)
  })

  it('dispatches SET_HAS_ACCOUNT with false when account is null', async () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue(null)

    const { result } = renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.SET_HAS_ACCOUNT,
      payload: [false],
    })
    expect(result.current.initializingAccount).toBe(false)
  })

  it('falls back to displayName when nickname is missing (e.g. v3 ias-ios migrated users)', async () => {
    const mockDispatch = jest.fn()
    const mockAccount = { nickname: undefined, displayName: 'Jane' }
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue(mockAccount)

    renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.UPDATE_NICKNAME,
      payload: ['Jane'],
    })
  })

  it('prefers nickname over displayName when both are present', async () => {
    const mockDispatch = jest.fn()
    const mockAccount = { nickname: 'My Wallet', displayName: 'Jane' }
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockResolvedValue(mockAccount)

    renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.UPDATE_NICKNAME,
      payload: ['My Wallet'],
    })
  })

  describe('nickname restoration (#4258)', () => {
    it('restores the nickname from the native account record when hasAccount is true but the nickname is missing, without dispatching SET_HAS_ACCOUNT', async () => {
      const mockDispatch = jest.fn()
      const mockAccount = { nickname: 'Combo' }
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([
          { stateLoaded: true, bcsc: { hasAccount: true, selectedNickname: undefined } } as any,
          mockDispatch,
        ])
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
      jest.mocked(retryModule.retryAsync).mockResolvedValue(mockAccount)

      const { result } = renderHook(() => useInitializeAccountStatus())

      await act(async () => {})

      expect(jest.mocked(retryModule.retryAsync)).toHaveBeenCalledWith(getAccount, 3, 500, true)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_NICKNAME,
        payload: ['Combo'],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: BCDispatchAction.SET_HAS_ACCOUNT }))
      expect(result.current.initializingAccount).toBe(false)
    })

    it('does not dispatch UPDATE_NICKNAME or downgrade hasAccount when the native account record is not found', async () => {
      const mockDispatch = jest.fn()
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([
          { stateLoaded: true, bcsc: { hasAccount: true, selectedNickname: undefined } } as any,
          mockDispatch,
        ])
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
      jest.mocked(retryModule.retryAsync).mockResolvedValue(null)

      const { result } = renderHook(() => useInitializeAccountStatus())

      await act(async () => {})

      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: BCDispatchAction.UPDATE_NICKNAME }))
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: BCDispatchAction.SET_HAS_ACCOUNT,
        payload: [false],
      })
      expect(result.current.initializingAccount).toBe(false)
    })

    it('never clobbers an existing nickname with a different native value', async () => {
      const mockDispatch = jest.fn()
      const mockAccount = { nickname: 'Combo' }
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([
          { stateLoaded: true, bcsc: { hasAccount: false, selectedNickname: 'MyNickname' } } as any,
          mockDispatch,
        ])
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
      jest.mocked(retryModule.retryAsync).mockResolvedValue(mockAccount)

      renderHook(() => useInitializeAccountStatus())

      await act(async () => {})

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_HAS_ACCOUNT,
        payload: [true],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: BCDispatchAction.UPDATE_NICKNAME }))
    })
  })

  it('logs error when getAccount throws', async () => {
    const mockDispatch = jest.fn()
    const mockLogger = { info: jest.fn(), error: jest.fn() }
    const mockError = new Error('Native bridge failure')
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(retryModule.retryAsync).mockRejectedValue(mockError)

    const { result } = renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useInitializeAccountStatus] Error checking for existing account:',
      mockError
    )
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(result.current.initializingAccount).toBe(false)
  })

  it('sets initializingAccount to false even when an error occurs', async () => {
    const mockDispatch = jest.fn()
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([{ stateLoaded: true, bcsc: { hasAccount: false } } as any, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)
    jest.mocked(retryModule.retryAsync).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useInitializeAccountStatus())

    await act(async () => {})

    expect(result.current.initializingAccount).toBe(false)
  })
})
