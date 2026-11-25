import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { popToThenPush } from '@/bcsc-theme/utils/pop-to-then-navigate'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { useScannedDriversLicenceViewModel } from './useScannedDriversLicenceViewModel'

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

describe('useScannedDriversLicenceViewModel', () => {
  let navigation: { goBack: jest.Mock; dispatch: jest.Mock }

  const renderViewModel = () => renderHook(() => useScannedDriversLicenceViewModel(navigation as never)).result

  beforeEach(() => {
    jest.clearAllMocks()
    navigation = { goBack: jest.fn(), dispatch: jest.fn() }
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    mockUpdateCardProcess.mockResolvedValue(undefined)
    mockDeleteScannedCardData.mockResolvedValue(undefined)
    setStore()
  })

  describe('handleContinueWithLicence', () => {
    it('enters the non-BCSC flow at its ID list, with IdentitySelection and the two-ID notice behind it', async () => {
      const result = renderViewModel()

      await act(() => result.current.handleContinueWithLicence())

      expect(mockUpdateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
      expect(popToThenPush).toHaveBeenCalledWith(navigation, BCSCScreens.IdentitySelection, [
        { name: BCSCScreens.DualIdentificationRequired },
        { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } },
      ])
    })

    it('sets the card process before navigating', async () => {
      const result = renderViewModel()

      await act(() => result.current.handleContinueWithLicence())

      expect(mockUpdateCardProcess.mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(popToThenPush).mock.invocationCallOrder[0]
      )
    })

    it('leaves scanned card data alone when there is none', async () => {
      const result = renderViewModel()

      await act(() => result.current.handleContinueWithLicence())

      expect(mockDeleteScannedCardData).not.toHaveBeenCalled()
    })

    it.each([
      ['a serial', { serial: 'S00023254' }],
      ['a birthdate', { birthdate: new Date(1982, 0, 4) }],
    ])('clears scanned card data when the store holds %s', async (_, bcscSecure) => {
      setStore(bcscSecure)
      const result = renderViewModel()

      await act(() => result.current.handleContinueWithLicence())

      expect(mockDeleteScannedCardData).toHaveBeenCalledTimes(1)
    })

    it('navigates once, however often it is pressed', async () => {
      const result = renderViewModel()

      await act(async () => {
        await Promise.all([result.current.handleContinueWithLicence(), result.current.handleContinueWithLicence()])
      })

      expect(mockUpdateCardProcess).toHaveBeenCalledTimes(1)
      expect(popToThenPush).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['setting the card process', () => mockUpdateCardProcess],
      ['clearing scanned card data', () => mockDeleteScannedCardData],
    ])('alerts and stays put when %s fails, then allows a retry', async (_, failing) => {
      setStore({ serial: 'S00023254' })
      const error = new Error('write failed')
      failing().mockRejectedValueOnce(error)
      const result = renderViewModel()

      await act(() => result.current.handleContinueWithLicence())

      expect(mockFailedToWriteToLocalStorageAlert).toHaveBeenCalledWith(error)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), error)
      expect(popToThenPush).not.toHaveBeenCalled()

      await act(() => result.current.handleContinueWithLicence())

      expect(popToThenPush).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleScanServicesCard', () => {
    it('goes back to the scanner, removing this screen from the stack', () => {
      const result = renderViewModel()

      act(() => result.current.handleScanServicesCard())

      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })
  })
})
