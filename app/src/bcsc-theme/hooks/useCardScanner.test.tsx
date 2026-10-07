import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_DL_BARCODE_NO_DCN_A, BC_DL_BARCODE_S } from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { formatIasAxiosResponseError, getAppErrorFromAxiosError } from '@/bcsc-theme/utils/axios-error-utils'
import { ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { AppError } from '@/errors/appError'
import { ErrorCategory } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { AccountSetupType } from '@/store'
import * as Bifold from '@bifold/core'
import * as navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import { AxiosError, AxiosResponse } from 'axios'
import { BCSCCardProcess } from 'react-native-bcsc-core'

jest.mock('@/bcsc-theme/services/hooks/useAuthorizationService')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/bcsc-theme/hooks/useDeviceAuthorizationRecovery')
jest.mock('@react-navigation/native')
jest.mock('@bifold/core')

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

    it('should handle combo card scan DL barcode only', async () => {
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
        'S00023254',
        expect.objectContaining({
          licenseNumber: '2222222',
          bcscSerial: 'S00023254',
        })
      )
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

    it('takes the 1D serial when it is read after a PDF-417 that holds a DCN, and keeps the DCN on the licence', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([licenceWithSerial, serial1D], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      expect(handleCardData).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ licenseNumber: '2222222', bcscSerial: 'S00023254' })
      )
    })

    it('takes the PDF-417 DCN when it is read after the 1D serial', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([serial1D, licenceWithSerial], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      expect(handleCardData).toHaveBeenCalledWith(
        'S00023254',
        expect.objectContaining({ licenseNumber: '2222222', bcscSerial: 'S00023254' })
      )
    })

    it('replaces the licence with a later PDF-417 that has no DCN, without clearing the captured serial', async () => {
      const { scanCard } = renderScanCard()
      const handleCardData = jest.fn()

      await scanCard([licenceWithSerial, licenceWithoutSerial], handleCardData)

      expect(handleCardData).toHaveBeenCalledTimes(1)
      const [serial, licence] = handleCardData.mock.calls[0]
      expect(serial).toBe('S00023254')
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

    const apiError = (appEvent: AppEventCode) =>
      new AppError(
        'Server Error',
        { category: ErrorCategory.GENERAL, appEvent, statusCode: 5000 },
        { cause: new Error('A human-readable description'), track: false }
      )

    const setup = (authorize: jest.Mock = jest.fn().mockResolvedValue(deviceAuthorization)) => {
      const handleAuthorizationError = jest.fn()
      const secure = {
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      }
      const nav = { navigate: jest.fn(), reset: jest.fn() }
      const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() }

      jest
        .mocked(useAuthorizationService)
        .mockReturnValue({ authorizeDeviceWithBarcodes: authorize, handleAuthorizationError } as any)
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

      return { hook: renderHook(() => useCardScanner()), authorize, handleAuthorizationError, secure, nav, logger }
    }

    const deferred = () => {
      let settle: { resolve: (value: unknown) => void; reject: (error: unknown) => void } = {
        resolve: () => undefined,
        reject: () => undefined,
      }
      const promise = new Promise((resolve, reject) => {
        settle = { resolve, reject }
      })
      return { promise, ...settle }
    }

    it('saves the card, resets to the setup route and returns true on a match', async () => {
      const { hook, authorize, secure, nav } = setup()

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(true)
      expect(authorize).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'CODE_128', value: SERIAL }),
          expect.objectContaining({ type: 'PDF_417', iso_iin: '636028' }),
        ]),
        { skipErrorHandling: true }
      )
      expect(secure.updateUserInfo).toHaveBeenCalledWith({ serial: SERIAL, birthdate: license.birthDate })
      expect(secure.updateDeviceCodes).toHaveBeenCalledWith({
        deviceCode: 'test-device-code',
        userCode: 'ABCD1234',
        deviceCodeExpiresAt: expect.any(Date),
      })
      expect(secure.updateCardProcess).toHaveBeenCalledWith(deviceAuthorization.process)
      expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
      // The serial is only saved once the server has matched the card.
      expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(secure.updateUserInfo.mock.invocationCallOrder[0])
    })

    it('continues the other-ID flow on card_not_found and saves nothing from the card', async () => {
      const { hook, handleAuthorizationError, secure, nav } = setup(
        jest.fn().mockRejectedValue(apiError(AppEventCode.CARD_NOT_FOUND))
      )

      const result = await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(result).toBe(true)
      expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      expect(secure.updateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
      expect(secure.updateUserInfo).not.toHaveBeenCalled()
      expect(handleAuthorizationError).not.toHaveBeenCalled()
      expect(nav.reset).not.toHaveBeenCalled()
    })

    it("continues the other-ID flow on the server's real card_not_found response", async () => {
      // The 400 body `/device/barcodes` returns for a licence, run through the client's own conversion.
      const response = {
        status: 400,
        data: { error: 'invalid_request', error_description: 'card_not_found' },
      } as AxiosResponse
      const axiosError = new AxiosError(
        'Request failed with status code 400',
        'ERR_BAD_REQUEST',
        undefined,
        {},
        response
      )
      const appError = getAppErrorFromAxiosError(formatIasAxiosResponseError(axiosError))
      const { hook, handleAuthorizationError, nav } = setup(jest.fn().mockRejectedValue(appError))

      await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(appError.appEvent).not.toBe(AppEventCode.CARD_NOT_FOUND)
      expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      expect(handleAuthorizationError).not.toHaveBeenCalled()
    })

    it('routes any other error through the authorization service', async () => {
      const error = apiError(AppEventCode.CARD_EXPIRED)
      const { hook, handleAuthorizationError, secure, nav } = setup(jest.fn().mockRejectedValue(error))

      await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(handleAuthorizationError).toHaveBeenCalledWith(error)
      expect(nav.navigate).not.toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      expect(secure.updateUserInfo).not.toHaveBeenCalled()
      expect(secure.updateCardProcess).not.toHaveBeenCalled()
    })

    it('logs a failure that is not an AppError', async () => {
      const { hook, logger } = setup(jest.fn().mockRejectedValue(new Error('native failure')))

      await hook.result.current.handleScanComboCard(SERIAL, license)

      expect(logger.error).toHaveBeenCalled()
    })

    describe('an answer for a scan that is no longer current', () => {
      it('does not start the other-ID flow after a late card_not_found', async () => {
        const request = deferred()
        const { hook, handleAuthorizationError, secure, nav } = setup(jest.fn().mockReturnValue(request.promise))
        let current = true

        const scan = hook.result.current.handleScanComboCard(SERIAL, license, () => current)
        current = false
        request.reject(apiError(AppEventCode.CARD_NOT_FOUND))

        expect(await scan).toBe(false)
        expect(secure.updateCardProcess).not.toHaveBeenCalled()
        expect(nav.navigate).not.toHaveBeenCalled()
        expect(handleAuthorizationError).not.toHaveBeenCalled()
      })

      it('does not save a late match', async () => {
        const request = deferred()
        const { hook, secure, nav } = setup(jest.fn().mockReturnValue(request.promise))
        let current = true

        const scan = hook.result.current.handleScanComboCard(SERIAL, license, () => current)
        current = false
        request.resolve(deviceAuthorization)

        expect(await scan).toBe(false)
        expect(secure.updateUserInfo).not.toHaveBeenCalled()
        expect(nav.reset).not.toHaveBeenCalled()
      })

      it('does not route a late error', async () => {
        const request = deferred()
        const { hook, handleAuthorizationError } = setup(jest.fn().mockReturnValue(request.promise))
        let current = true

        const scan = hook.result.current.handleScanComboCard(SERIAL, license, () => current)
        current = false
        request.reject(apiError(AppEventCode.CARD_EXPIRED))

        expect(await scan).toBe(false)
        expect(handleAuthorizationError).not.toHaveBeenCalled()
      })
    })

    it.each([
      ['invalid', new Date('Invalid Date')],
      ['missing', undefined],
    ])('should throw error if license birthdate is %s', async (_, birthDate) => {
      const { hook, authorize } = setup()

      await expect(hook.result.current.handleScanComboCard(SERIAL, { birthDate } as any)).rejects.toThrow(
        'handleScanComboCard: License birthdate is missing or invalid'
      )
      expect(authorize).not.toHaveBeenCalled()
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
