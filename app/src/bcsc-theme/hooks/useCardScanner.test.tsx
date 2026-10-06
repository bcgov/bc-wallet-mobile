import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_DL_BARCODE_NO_DCN_A, BC_DL_BARCODE_S } from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { AppError } from '@/errors/appError'
import { ErrorCategory } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { AccountSetupType } from '@/store'
import * as Bifold from '@bifold/core'
import * as navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

jest.mock('@/bcsc-theme/services/hooks/useAuthorizationService')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/bcsc-theme/hooks/useDeviceAuthorizationRecovery')
jest.mock('@react-navigation/native')
jest.mock('@bifold/core')
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: jest.fn(), getCurrentRoute: jest.fn() },
}))

const mockDispatch = jest.fn() // unused atp

describe('useCardScanner', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // useCardScanner calls useRoute()/useDeviceAuthorizationRecovery() unconditionally at the top
    // of the hook, regardless of which handler a given test exercises. Its own recovery behavior
    // is covered by useDeviceAuthorizationRecovery.test.ts — this is a transparent passthrough.
    jest.mocked(navigation).useRoute.mockReturnValue({ name: BCSCScreens.ScanSerial } as any)
    jest.mocked(useDeviceAuthorizationRecovery).mockReturnValue(((thunk: () => Promise<unknown>) => thunk()) as any)
  })

  describe('scanCard', () => {
    it('should handle BCSCS card scan', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockBarcode: ScanableCode = {
        type: 'code-39',
        value: 'K12345678',
      }
      const mockHandleCardData = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const scanCard = hook.result.current.scanCard

      await scanCard([mockBarcode], mockHandleCardData)

      expect(mockHandleCardData).toHaveBeenNthCalledWith(1, 'K12345678', null)
    })

    it('should handle a PDF-417 alone, taking no serial from its DCN', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockBarcode: ScanableCode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_S,
      }
      const mockHandleCardData = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const scanCard = hook.result.current.scanCard

      await scanCard([mockBarcode], mockHandleCardData)

      expect(mockHandleCardData).toHaveBeenNthCalledWith(
        1,
        null,
        expect.objectContaining({
          licenseNumber: '2222222',
        })
      )
      expect(mockHandleCardData.mock.calls[0][1]).not.toHaveProperty('bcscSerial')
    })

    it('should handle drivers license barcode scan', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockBarcode: ScanableCode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_NO_DCN_A,
      }
      const mockHandleCardData = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const scanCard = hook.result.current.scanCard

      await scanCard([mockBarcode], mockHandleCardData)

      expect(mockHandleCardData).toHaveBeenNthCalledWith(
        1,
        null,
        expect.objectContaining({
          licenseNumber: '2222222',
        })
      )
    })

    it('should process multiple barcodes on a combo card scan', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockDLBarcode: ScanableCode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_NO_DCN_A,
      }
      const mockBCSCBarcode: ScanableCode = {
        type: 'code-39',
        value: 'S00023254',
      }
      const mockHandleCardData = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const scanCard = hook.result.current.scanCard

      await scanCard([mockDLBarcode, mockBCSCBarcode], mockHandleCardData)

      expect(mockHandleCardData).toHaveBeenNthCalledWith(
        1,
        'S00023254',
        expect.objectContaining({
          licenseNumber: '2222222',
        })
      )
    })

    it('should process a combo card scan with the serial ordered before the licence code (regression #4256/#4302)', async () => {
      // scanCard/handleCardScan is order-independent: it decodes each code by kind into
      // separate bcscSerial/license fields regardless of array position. This deliberately
      // passes [serial, licence] — the REVERSE of mergeLockedCodesWithAccumulated's actual
      // output order (accumulated extras like the licence come first: [licence, serial]).
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const code39Serial: ScanableCode = {
        type: 'code-39',
        value: 'S00023254',
      }
      const pdf417DL: ScanableCode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_NO_DCN_A,
      }
      const mockHandleCardData = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const scanCard = hook.result.current.scanCard

      await scanCard([code39Serial, pdf417DL], mockHandleCardData)

      expect(mockHandleCardData).toHaveBeenNthCalledWith(
        1,
        'S00023254',
        expect.objectContaining({
          licenseNumber: '2222222',
        })
      )
    })
  })

  describe('scanCard with several codes', () => {
    const renderScanCard = () => {
      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const debug = jest.fn()

      jest.mocked(useAuthorizationService).mockReturnValue({ authorizeDevice: jest.fn() } as any)
      jest.mocked(useSecureActions).mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      jest.mocked(Bifold).useStore.mockReturnValue([mockState, mockDispatch])
      jest.mocked(Bifold).useServices.mockReturnValue([{ debug } as any])

      return { scanCard: renderHook(() => useCardScanner()).result.current.scanCard, debug }
    }

    const licenceWithSerial: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S }
    const licenceWithoutSerial: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_NO_DCN_A }
    const serial1D: ScanableCode = { type: 'code-39', value: 'K12345678' }

    it('takes the 1D serial when it is read after a PDF-417 that holds a DCN', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([licenceWithSerial, serial1D], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      expect(handleCardData).toHaveBeenCalledWith('K12345678', expect.objectContaining({ licenseNumber: '2222222' }))
      expect(handleCardData.mock.calls[0][1]).not.toHaveProperty('bcscSerial')
    })

    it('keeps the 1D serial when a PDF-417 that holds a DCN is read after it', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([serial1D, licenceWithSerial], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      expect(handleCardData).toHaveBeenCalledWith('K12345678', expect.objectContaining({ licenseNumber: '2222222' }))
    })

    it('replaces the licence with a later PDF-417 that has no DCN, leaving no serial', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([licenceWithSerial, licenceWithoutSerial], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      const [serial, licence] = handleCardData.mock.calls[0]
      expect(serial).toBeNull()
      expect(licence).toMatchObject({ birthDate: new Date('1970-09-06') })
      expect(licence).not.toHaveProperty('bcscSerial')
    })

    it('logs the barcode type and result, not the scanned contents', async () => {
      const { scanCard, debug } = renderScanCard()
      const handleCardData = jest.fn()
      const notASerial: ScanableCode = { type: 'code-39', value: '123456789' }
      const damaged: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?') }

      await scanCard([licenceWithSerial, serial1D, notASerial, damaged], handleCardData)

      const logged = JSON.stringify(debug.mock.calls)
      expect(logged).toContain('"source":"pdf417"')
      expect(logged).toContain('"source":"1d"')
      expect(logged).toContain('"reason":"unsupported"')
      expect(logged).toContain('"reason":"damaged"')
      for (const sensitive of [
        BC_DL_BARCODE_S,
        'K12345678',
        '123456789',
        'S00023254',
        'SPECIMEN',
        'specimen',
        '2222222',
        'V8W3Y8',
      ]) {
        expect(logged).not.toContain(sensitive)
      }
    })
  })

  describe('handleScanComboCard', () => {
    const SERIAL = 'S00023254'
    const license: any = { birthDate: new Date(1970, 0, 1), isoIIN: '636028', licenseNumber: '2222222' }
    const deviceAuthorization = {
      device_code: 'test-device-code',
      user_code: 'ABCD1234',
      verified_email: 'test@example.com',
      expires_in: 3600,
      verification_options: 'video_call back_check',
      process: 'IDIM L3 Remote BCSC Photo Identity Verification',
    }

    const iasError = (appEvent: AppEventCode) =>
      new AppError(
        'Server Error',
        { category: ErrorCategory.GENERAL, appEvent, statusCode: 5000 },
        { cause: new Error('A human-readable description'), track: false }
      )

    const setup = (overrides: { authorize?: jest.Mock; secure?: Record<string, jest.Mock> } = {}) => {
      const authorizeDeviceWithBarcodes = overrides.authorize ?? jest.fn().mockResolvedValue(deviceAuthorization)
      const handleAuthorizationError = jest.fn()
      const secure = {
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
        ...overrides.secure,
      }
      const nav = { navigate: jest.fn(), reset: jest.fn() }
      const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() }

      jest.mocked(useAuthorizationService).mockReturnValue({
        authorizeDeviceWithBarcodes,
        handleAuthorizationError,
      } as any)
      jest.mocked(useSecureActions).mockReturnValue(secure as any)
      jest.mocked(Bifold).useStore.mockReturnValue([
        {
          bcsc: { accountSetupType: AccountSetupType.AddAccount },
          bcscSecure: { additionalEvidenceData: [] },
        } as any,
        mockDispatch,
      ])
      jest.mocked(navigation).useNavigation = jest.fn().mockReturnValue(nav)
      jest.mocked(Bifold).useServices.mockReturnValue([logger as any])
      jest.mocked(navigationRef.isReady).mockReturnValue(true)
      jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: BCSCScreens.ScanSerial } as any)

      const hook = renderHook(() => useCardScanner())
      return { hook, authorizeDeviceWithBarcodes, handleAuthorizationError, secure, nav, logger }
    }

    it('saves the card, resets to the setup route and returns true on a match', async () => {
      const { hook, authorizeDeviceWithBarcodes, secure, nav } = setup()

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(true)
      expect(authorizeDeviceWithBarcodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'CODE_128', value: SERIAL }),
          expect.objectContaining({ type: 'PDF_417', iso_iin: '636028' }),
        ]),
        { skipErrorHandling: true }
      )
      expect(secure.updateUserInfo).toHaveBeenCalledWith({ serial: SERIAL, birthdate: license.birthDate })
      expect(secure.updateUserInfo).toHaveBeenCalledWith({ email: 'test@example.com', isEmailVerified: true })
      expect(secure.updateDeviceCodes).toHaveBeenCalledWith({
        deviceCode: 'test-device-code',
        userCode: 'ABCD1234',
        deviceCodeExpiresAt: expect.any(Date),
      })
      expect(secure.updateCardProcess).toHaveBeenCalledWith(deviceAuthorization.process)
      expect(secure.updateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])
      expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
      // The serial is only saved once the server has matched the card.
      expect(authorizeDeviceWithBarcodes.mock.invocationCallOrder[0]).toBeLessThan(
        secure.updateUserInfo.mock.invocationCallOrder[0]
      )
    })

    it('saves the other-ID card process before navigating on card_not_found, and stores nothing from the card', async () => {
      const { hook, handleAuthorizationError, secure, nav } = setup({
        authorize: jest.fn().mockRejectedValue(iasError(AppEventCode.CARD_NOT_FOUND)),
      })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(true)
      expect(secure.updateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
      expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      expect(secure.updateCardProcess.mock.invocationCallOrder[0]).toBeLessThan(
        nav.navigate.mock.invocationCallOrder[0]
      )
      expect(secure.updateUserInfo).not.toHaveBeenCalled()
      expect(handleAuthorizationError).not.toHaveBeenCalled()
      expect(nav.reset).not.toHaveBeenCalled()
    })

    it('does not navigate and returns false when saving the other-ID card process fails', async () => {
      const { hook, nav, logger } = setup({
        authorize: jest.fn().mockRejectedValue(iasError(AppEventCode.CARD_NOT_FOUND)),
        secure: { updateCardProcess: jest.fn().mockRejectedValue(new Error('storage failed')) },
      })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(false)
      expect(nav.navigate).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('does not reset and returns false when a save fails after a match', async () => {
      const { hook, nav, logger } = setup({
        secure: { updateDeviceCodes: jest.fn().mockRejectedValue(new Error('storage failed')) },
      })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(false)
      expect(nav.reset).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('routes any other error through the authorization service with the scanned card, and returns false when it only alerts', async () => {
      const error = iasError(AppEventCode.SERVER_ERROR)
      const { hook, handleAuthorizationError, secure } = setup({ authorize: jest.fn().mockRejectedValue(error) })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(handleAuthorizationError).toHaveBeenCalledWith(error, { serial: SERIAL, birthdate: '1970-01-01' })
      expect(result).toBe(false)
      expect(secure.updateUserInfo).not.toHaveBeenCalled()
      expect(secure.updateCardProcess).not.toHaveBeenCalled()
    })

    it('returns true when the routed error moved the user off the scan screen', async () => {
      const error = iasError(AppEventCode.CARD_EXPIRED)
      const { hook, handleAuthorizationError } = setup({ authorize: jest.fn().mockRejectedValue(error) })
      handleAuthorizationError.mockImplementation(() => {
        jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: BCSCScreens.VerificationCardError } as any)
      })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(true)
    })

    it('returns false without routing when the failure is not an AppError', async () => {
      const { hook, handleAuthorizationError, logger } = setup({
        authorize: jest.fn().mockRejectedValue(new Error('native failure')),
      })

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(false)
      expect(handleAuthorizationError).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it.each([
      ['invalid', new Date('Invalid Date')],
      ['missing', undefined],
    ])('should throw error if license birthdate is %s', async (_, birthDate) => {
      const { hook, authorizeDeviceWithBarcodes } = setup()

      await expect(hook.result.current.handleScanComboCard(SERIAL, { birthDate } as any)).rejects.toThrow(
        'handleScanComboCard: License birthdate is missing or invalid'
      )
      expect(authorizeDeviceWithBarcodes).not.toHaveBeenCalled()
    })
  })

  describe('handleScanBCServicesCard', () => {
    it('should dispatch actions and navigate to EnterBirthdate screen', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockUpdateUserInfo = jest.fn()
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockNavigationReset = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: mockUpdateUserInfo,
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      navigationMock.useNavigation = jest.fn().mockReturnValue({
        reset: mockNavigationReset,
      })
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const handleScanBCServicesCard = hook.result.current.handleScanBCServicesCard

      const mockBCSCSerial = 'K12345678'

      await handleScanBCServicesCard(mockBCSCSerial)

      expect(mockUpdateUserInfo).toHaveBeenCalledWith({
        serial: mockBCSCSerial,
      })
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.EnterBirthdate }],
      })
    })
  })

  describe('handleScanNonBcsc', () => {
    it('should navigate to DualIdentificationRequired and set the Non-BCSC card process', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockUpdateCardProcess = jest.fn()
      const mockNavigationNavigate = jest.fn()

      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: mockUpdateCardProcess,
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      navigationMock.useNavigation = jest.fn().mockReturnValue({ navigate: mockNavigationNavigate })
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      await hook.result.current.handleScanNonBcsc()

      expect(mockNavigationNavigate).toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      // Downstream screens (EvidenceIDCollection, getResumeStepRoute) read the card process from the store
      expect(mockUpdateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
      expect(mockUpdateCardProcess.mock.invocationCallOrder[0]).toBeLessThan(
        mockNavigationNavigate.mock.invocationCallOrder[0]
      )
    })
  })

  describe('handleScanBarcodes', () => {
    const mockLicense: any = {
      birthDate: new Date('1970-01-01'),
      isoIIN: '636028',
      licenseNumber: '2222222',
    }

    it('should authorize via /device/barcodes and reroute to setup when the barcodes match a BC Services Card', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockUpdateDeviceCodes = jest.fn()
      const mockUpdateCardProcess = jest.fn()
      const mockUpdateVerificationOptions = jest.fn()
      const mockNavigationReset = jest.fn()
      const mockAuthorizeDeviceWithBarcodes = jest.fn().mockResolvedValue({
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call back_check',
        process: 'IDIM L3 Remote BCSC Photo Identity Verification',
      })

      useAuthorizationServiceMock.mockReturnValue({
        authorizeDeviceWithBarcodes: mockAuthorizeDeviceWithBarcodes,
      } as any)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: mockUpdateDeviceCodes,
        updateCardProcess: mockUpdateCardProcess,
        updateVerificationOptions: mockUpdateVerificationOptions,
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      navigationMock.useNavigation = jest.fn().mockReturnValue({ reset: mockNavigationReset })
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn(), info: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const result = await hook.result.current.handleScanBarcodes('S00023254', mockLicense)

      expect(result).toBe(true)
      expect(mockAuthorizeDeviceWithBarcodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'CODE_128', value: 'S00023254' }),
          expect.objectContaining({ type: 'PDF_417', iso_iin: '636028' }),
        ]),
        // A non-match is an expected "not a BCSC, continue" outcome here, not a failure —
        // the service's own error handling is skipped so this call site's catch decides.
        { skipErrorHandling: true }
      )
      expect(mockUpdateCardProcess).toHaveBeenCalledWith('IDIM L3 Remote BCSC Photo Identity Verification')
      expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })
  })

  describe('handleScanDriversLicense', () => {
    const license = {
      licenseNumber: '2222222',
      isoIIN: '636028',
      firstName: 'test',
      middleNames: 'card',
      lastName: 'specimen',
      birthDate: new Date('1982-01-04'),
      expiryDate: new Date('2026-01-31'),
      streetAddress: '910 government st',
      city: 'victoria',
      province: 'BC',
      postalCode: 'V8W3Y8',
    }

    const renderWithMetadataSpy = () => {
      const updateUserMetadata = jest.fn()
      jest.mocked(useAuthorizationService).mockReturnValue({} as any)
      jest.mocked(useSecureActions).mockReturnValue({ updateUserMetadata, updateUserInfo: jest.fn() } as any)
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcsc: {}, bcscSecure: {} } as any, mockDispatch])
      jest.mocked(Bifold).useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())
      return { handleScanDriversLicense: hook.result.current.handleScanDriversLicense, updateUserMetadata }
    }

    it('pre-fills a Canadian address', async () => {
      const { handleScanDriversLicense, updateUserMetadata } = renderWithMetadataSpy()

      await handleScanDriversLicense({ ...license, province: 'AB' })

      expect(updateUserMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ address: expect.objectContaining({ province: 'AB', country: 'CA' }) })
      )
    })

    it('leaves the address out when its province is not Canadian', async () => {
      const { handleScanDriversLicense, updateUserMetadata } = renderWithMetadataSpy()

      await handleScanDriversLicense({ ...license, city: 'seattle', province: 'WA', postalCode: '98101' })

      expect(updateUserMetadata).toHaveBeenCalledWith({ name: { first: 'test', last: 'specimen', middle: 'card' } })
    })
  })
})
