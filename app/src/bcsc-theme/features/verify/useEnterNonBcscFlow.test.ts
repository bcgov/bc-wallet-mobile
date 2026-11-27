import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { popToThenPush } from '@/bcsc-theme/utils/pop-to-then-navigate'
import * as Bifold from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { act, renderHook } from '@testing-library/react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { useEnterNonBcscFlow } from './useEnterNonBcscFlow'

const mockUpdateCardProcess = jest.fn()
const mockDeleteScannedCardData = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ updateCardProcess: mockUpdateCardProcess, deleteScannedCardData: mockDeleteScannedCardData }),
}))
const mockFailedToWriteToLocalStorageAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ failedToWriteToLocalStorageAlert: mockFailedToWriteToLocalStorageAlert }),
}))
jest.mock('@/bcsc-theme/utils/pop-to-then-navigate', () => ({ popToThenPush: jest.fn() }))
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
  useServices: jest.fn(),
}))

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

const setStore = (bcscSecure: { birthdate?: Date; serial?: string } = {}) =>
  jest.mocked(Bifold.useStore).mockReturnValue([{ bcscSecure } as never, jest.fn()])

const ROUTES = [{ name: BCSCScreens.DualIdentificationRequired }] as const

describe('useEnterNonBcscFlow', () => {
  let navigation: { dispatch: jest.Mock }

  const renderEnter = () => renderHook(() => useEnterNonBcscFlow(navigation, '[Test]')).result
  const enter = (result: ReturnType<typeof renderEnter>) =>
    act(() => result.current.enterNonBcscFlow(ROUTES, 'User chose something'))

  beforeEach(() => {
    jest.clearAllMocks()
    navigation = { dispatch: jest.fn() }
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    mockUpdateCardProcess.mockResolvedValue(undefined)
    mockDeleteScannedCardData.mockResolvedValue(undefined)
    setStore()
  })

  it('saves the non-BCSC card process, then opens the routes above IdentitySelection', async () => {
    const result = renderEnter()

    await enter(result)

    expect(mockUpdateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
    expect(popToThenPush).toHaveBeenCalledWith(navigation, BCSCScreens.IdentitySelection, ROUTES)
    expect(mockUpdateCardProcess.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(popToThenPush).mock.invocationCallOrder[0]
    )
  })

  it('logs the tagged reason', async () => {
    const result = renderEnter()

    await enter(result)

    expect(mockLogger.info).toHaveBeenCalledWith('[Test] User chose something, entering the non-BCSC flow')
  })

  it('leaves scanned card data alone when there is none', async () => {
    const result = renderEnter()

    await enter(result)

    expect(mockDeleteScannedCardData).not.toHaveBeenCalled()
  })

  it.each([
    ['a serial', { serial: 'S00023254' }],
    ['a birthdate', { birthdate: new Date(1982, 0, 4) }],
  ])('clears scanned card data when the store holds %s', async (_, bcscSecure) => {
    setStore(bcscSecure)
    const result = renderEnter()

    await enter(result)

    expect(mockDeleteScannedCardData).toHaveBeenCalledTimes(1)
  })

  it('navigates once, however often it is called while in flight', async () => {
    const result = renderEnter()

    await act(async () => {
      await Promise.all([
        result.current.enterNonBcscFlow(ROUTES, 'first'),
        result.current.enterNonBcscFlow(ROUTES, 'second'),
      ])
    })

    expect(mockUpdateCardProcess).toHaveBeenCalledTimes(1)
    expect(popToThenPush).toHaveBeenCalledTimes(1)
  })

  it('works again once the screen regains focus, when the screen was left mounted under the flow', async () => {
    const result = renderEnter()

    await enter(result)
    // Still mounted (IdentitySelection was not in the stack); the guard holds until focus returns.
    await enter(result)
    expect(popToThenPush).toHaveBeenCalledTimes(1)

    act(() => {
      jest.mocked(useFocusEffect).mock.calls.at(-1)?.[0]()
    })
    await enter(result)

    expect(popToThenPush).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['saving the card process', () => mockUpdateCardProcess],
    ['clearing scanned card data', () => mockDeleteScannedCardData],
  ])('alerts and stays put when %s fails, then allows a retry', async (_, failing) => {
    setStore({ serial: 'S00023254' })
    const error = new Error('write failed')
    failing().mockRejectedValueOnce(error)
    const result = renderEnter()

    // Resolves rather than rejecting, so the press handler never leaves an unhandled rejection.
    await enter(result)

    expect(mockFailedToWriteToLocalStorageAlert).toHaveBeenCalledWith(error)
    expect(mockLogger.error).toHaveBeenCalledWith('[Test] Failed to enter the non-BCSC flow', error)
    expect(popToThenPush).not.toHaveBeenCalled()

    await enter(result)

    expect(popToThenPush).toHaveBeenCalledTimes(1)
  })
})
