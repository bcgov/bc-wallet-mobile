import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_DL_BARCODE_NO_DCN_A, BC_DL_BARCODE_S } from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
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
jest.mock('@/bcsc-theme/services/hooks/useRegistrationService')
const mockEnsureRegistered = jest.fn()
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
    it('should dispatch actions and navigate on successful device authorization', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [] },
      }
      const mockUpdateUserInfo = jest.fn()
      const mockUpdateDeviceCodes = jest.fn()
      const mockUpdateCardProcess = jest.fn()
      const mockUpdateVerificationOptions = jest.fn()
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn().mockResolvedValue({
            device_code: 'test-device-code',
            user_code: 'ABCD1234',
            verified_email: 'test@example.com',
            expires_in: 3600,
            verification_options: 'video_call back_check',
            process: 'IDIM L3 Remote BCSC Photo Identity Verification',
          }),
        },
      }
      const mockNavigationReset = jest.fn()

      useAuthorizationServiceMock.mockReturnValue(mockAuthorization.authorization)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: mockUpdateUserInfo,
        updateDeviceCodes: mockUpdateDeviceCodes,
        updateCardProcess: mockUpdateCardProcess,
        updateVerificationOptions: mockUpdateVerificationOptions,
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      navigationMock.useNavigation = jest.fn().mockReturnValue({
        reset: mockNavigationReset,
      })
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const handleScanComboCard = hook.result.current.handleScanComboCard

      const mockBCSCSerial = 'S00023254'
      const mockLicenseData: any = {
        birthDate: new Date('1970-01-01'),
      }

      await handleScanComboCard(mockBCSCSerial, mockLicenseData)

      expect(mockUpdateUserInfo).toHaveBeenCalledWith({
        serial: mockBCSCSerial,
        birthdate: mockLicenseData.birthDate,
      })
      expect(mockUpdateUserInfo).toHaveBeenCalledWith({
        email: 'test@example.com',
        isEmailVerified: true,
      })
      expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({
        deviceCode: 'test-device-code',
        userCode: 'ABCD1234',
        deviceCodeExpiresAt: expect.any(Date),
      })
      expect(mockUpdateCardProcess).toHaveBeenCalledWith('IDIM L3 Remote BCSC Photo Identity Verification')
      expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('should throw error if license birthdate is invalid', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
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

      const handleScanComboCard = hook.result.current.handleScanComboCard

      const mockBCSCSerial = 'S00023254'
      const mockLicenseData: any = {
        birthDate: new Date('Invalid Date'),
      }

      await expect(handleScanComboCard(mockBCSCSerial, mockLicenseData)).rejects.toThrow(
        'handleScanComboCard: License birthdate is missing or invalid'
      )
    })

    it('should throw error if license birthdate is missing', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
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

      const handleScanComboCard = hook.result.current.handleScanComboCard

      const mockBCSCSerial = 'S00023254'
      const mockLicenseData: any = {
        birthDate: undefined,
      }

      await expect(handleScanComboCard(mockBCSCSerial, mockLicenseData)).rejects.toThrow(
        'handleScanComboCard: License birthdate is missing or invalid'
      )
    })

    it('should call the authorization service (which owns error-screen navigation) and return true on failure', async () => {
      const useAuthorizationServiceMock = jest.mocked(useAuthorizationService)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {
        bcsc: { accountSetupType: AccountSetupType.AddAccount },
        bcscSecure: { additionalEvidenceData: [], cardProcess: undefined },
      }
      const mockUpdateUserInfo = jest.fn()
      const mockAuthorizeDevice = jest.fn().mockRejectedValue(new Error('Authorization failed'))
      const mockNavigationReset = jest.fn()
      const mockNavigationNavigate = jest.fn()

      useAuthorizationServiceMock.mockReturnValue({ authorizeDevice: mockAuthorizeDevice } as any)
      useSecureActionsMock.mockReturnValue({
        updateUserInfo: mockUpdateUserInfo,
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      bifoldMock.useStore.mockReturnValue([mockState, mockDispatch])
      navigationMock.useNavigation = jest.fn().mockReturnValue({
        navigate: mockNavigationNavigate,
        reset: mockNavigationReset,
      })
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn(), error: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      const handleScanComboCard = hook.result.current.handleScanComboCard

      const mockBCSCSerial = 'S00023254'
      const mockLicenseData: any = {
        birthDate: new Date('1970-01-01'),
      }

      const result = await handleScanComboCard(mockBCSCSerial, mockLicenseData)

      expect(mockUpdateUserInfo).toHaveBeenCalledWith({
        serial: mockBCSCSerial,
        birthdate: mockLicenseData.birthDate,
      })
      // Not the Non-BCSC flow, so the service's own error handling isn't skipped — the
      // authorization service (not this hook) owns navigating to the right error screen.
      expect(mockAuthorizeDevice).toHaveBeenCalledWith(mockBCSCSerial, mockLicenseData.birthDate, {
        skipErrorHandling: false,
      })
      expect(mockNavigationNavigate).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('handleScanComboCard with a device registered late (stuck account)', () => {
    const setup = (authorizeDevice: jest.Mock) => {
      const mockNavigationReset = jest.fn()
      jest.mocked(useAuthorizationService).mockReturnValue({ authorizeDevice } as any)
      jest.mocked(useSecureActions).mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: jest.fn(),
        updateVerificationOptions: jest.fn(),
      } as any)
      jest.mocked(Bifold).useStore.mockReturnValue([
        {
          bcsc: { accountSetupType: AccountSetupType.AddAccount },
          bcscSecure: { additionalEvidenceData: [] },
        } as any,
        mockDispatch,
      ])
      jest.mocked(navigation).useNavigation = jest.fn().mockReturnValue({ reset: mockNavigationReset })
      const logger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
      jest.mocked(Bifold).useServices.mockReturnValue([logger as any])
      jest
        .mocked(useRegistrationService)
        .mockReturnValue({ ensureRegistered: mockEnsureRegistered, cycleRegistration: jest.fn() } as any)
      // The real recovery hook, so the scanner is exercised against the actual register-then-retry behaviour
      jest
        .mocked(useDeviceAuthorizationRecovery)
        .mockImplementation(() =>
          jest.requireActual('@/bcsc-theme/hooks/useDeviceAuthorizationRecovery').useDeviceAuthorizationRecovery()
        )

      return { hook: renderHook(() => useCardScanner()), mockNavigationReset, logger }
    }

    const notRegisteredError = () =>
      new AppError('No account found. Please register first.', ErrorRegistry.ACCOUNT_NOT_REGISTERED, { track: false })
    const licenseData: any = { birthDate: new Date('1970-01-01') }

    it('registers the device, retries the authorization and navigates on success', async () => {
      mockEnsureRegistered.mockResolvedValue(undefined)
      const authorizeDevice = jest.fn().mockRejectedValueOnce(notRegisteredError()).mockResolvedValueOnce({
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        expires_in: 3600,
        verification_options: 'video_call back_check',
        process: 'IDIM L3 Remote BCSC Photo Identity Verification',
      })
      const { hook, mockNavigationReset } = setup(authorizeDevice)

      const result = await hook.result.current.handleScanComboCard('S00023254', licenseData)

      expect(result).toBe(true)
      expect(mockEnsureRegistered).toHaveBeenCalledTimes(1)
      expect(authorizeDevice).toHaveBeenCalledTimes(2)
      expect(mockNavigationReset).toHaveBeenCalledTimes(1)
    })

    it('resolves true without navigating when registration fails', async () => {
      const registrationFailure = new AppError(
        'registration failed',
        { category: ErrorCategory.NETWORK, appEvent: AppEventCode.NO_INTERNET, statusCode: 2100 },
        { track: false }
      )
      registrationFailure.handled = true
      mockEnsureRegistered.mockRejectedValue(registrationFailure)
      const authorizeDevice = jest.fn().mockRejectedValue(notRegisteredError())
      const { hook, mockNavigationReset, logger } = setup(authorizeDevice)

      const result = await hook.result.current.handleScanComboCard('S00023254', licenseData)

      expect(result).toBe(true)
      expect(mockEnsureRegistered).toHaveBeenCalledTimes(1)
      // The rethrown error was the already-handled registration failure, not the raw guard error
      expect(logger.error).not.toHaveBeenCalled()
      expect(authorizeDevice).toHaveBeenCalledTimes(1)
      expect(mockNavigationReset).not.toHaveBeenCalled()
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
    const frontSide = { image_side_name: 'FRONT_SIDE' }
    const backSide = { image_side_name: 'BACK_SIDE' }
    const driversLicence: any = { evidence_type: 'BC_DL', has_photo: true, image_sides: [frontSide, backSide] }
    const passport: any = { evidence_type: 'CA_PASSPORT', has_photo: true, image_sides: [frontSide] }
    const birthCertificate: any = { evidence_type: 'BIRTH_CERT', has_photo: false, image_sides: [frontSide] }
    const completedId = (evidenceType: unknown) => ({
      evidenceType,
      documentNumber: '123456789',
      metadata: [{ label: 'FRONT_SIDE' }],
    })
    // The card itself, picked as a licence when the list was shown. Its photos are only stored once every
    // side is accepted, so the entry is still empty when the barcodes are checked.
    const cardBeingCaptured = { evidenceType: driversLicence, metadata: [] }

    const renderScanner = (process: BCSCCardProcess, additionalEvidenceData: any[]) => {
      const mockNavigationReset = jest.fn()
      const mockUpdateCardProcess = jest.fn()
      const mockUpdateVerificationOptions = jest.fn()
      const mockClearAdditionalEvidence = jest.fn()
      const mockRemoveEvidenceByType = jest.fn(async (evidenceType: any) =>
        additionalEvidenceData.filter((item) => item.evidenceType.evidence_type !== evidenceType.evidence_type)
      )
      const mockAuthorizeDeviceWithBarcodes = jest.fn().mockResolvedValue({
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call back_check',
        process,
      })
      const navigationMock = jest.mocked(navigation)

      jest.mocked(useAuthorizationService).mockReturnValue({
        authorizeDeviceWithBarcodes: mockAuthorizeDeviceWithBarcodes,
      } as any)
      jest.mocked(useSecureActions).mockReturnValue({
        updateUserInfo: jest.fn(),
        updateDeviceCodes: jest.fn(),
        updateCardProcess: mockUpdateCardProcess,
        updateVerificationOptions: mockUpdateVerificationOptions,
        removeEvidenceByType: mockRemoveEvidenceByType,
        clearAdditionalEvidence: mockClearAdditionalEvidence,
      } as any)
      jest.mocked(Bifold).useStore.mockReturnValue([
        {
          bcsc: { accountSetupType: AccountSetupType.AddAccount },
          bcscSecure: { cardProcess: BCSCCardProcess.NonBCSC, additionalEvidenceData },
        } as any,
        mockDispatch,
      ])
      navigationMock.useNavigation = jest.fn().mockReturnValue({ reset: mockNavigationReset })
      jest.mocked(Bifold).useServices.mockReturnValue([{ debug: jest.fn(), info: jest.fn() } as any])

      const hook = renderHook(() => useCardScanner())

      return {
        handleScanBarcodes: hook.result.current.handleScanBarcodes,
        mockAuthorizeDeviceWithBarcodes,
        mockUpdateCardProcess,
        mockUpdateVerificationOptions,
        mockClearAdditionalEvidence,
        mockRemoveEvidenceByType,
        mockNavigationReset,
      }
    }

    it('should authorize via /device/barcodes and reroute a photo card to setup without any IDs', async () => {
      const scanner = renderScanner(BCSCCardProcess.BCSCPhoto, [cardBeingCaptured])

      const result = await scanner.handleScanBarcodes('S00023254', mockLicense, driversLicence)

      expect(result).toBe(true)
      expect(scanner.mockAuthorizeDeviceWithBarcodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'CODE_128', value: 'S00023254' }),
          expect.objectContaining({ type: 'PDF_417', iso_iin: '636028' }),
        ]),
        // A non-match is an expected "not a BCSC, continue" outcome here, not a failure —
        // the service's own error handling is skipped so this call site's catch decides.
        { skipErrorHandling: true }
      )
      expect(scanner.mockUpdateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.BCSCPhoto)
      expect(scanner.mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])
      // A photo card is verified without additional IDs, and they are gone before the route is chosen
      expect(scanner.mockClearAdditionalEvidence).toHaveBeenCalled()
      expect(scanner.mockClearAdditionalEvidence.mock.invocationCallOrder[0]).toBeLessThan(
        scanner.mockNavigationReset.mock.invocationCallOrder[0]
      )
      expect(scanner.mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('should reroute a non-photo card photographed as the first ID to the screen explaining the photo ID it needs', async () => {
      const scanner = renderScanner(BCSCCardProcess.BCSCNonPhoto, [cardBeingCaptured])

      await scanner.handleScanBarcodes('S00023254', mockLicense, driversLicence)

      // Routed from the list without the card's own entry; from the stale one, the user would be sent to
      // restart its capture (IDPhotoInformation) instead
      expect(scanner.mockRemoveEvidenceByType).toHaveBeenCalledWith(driversLicence)
      expect(scanner.mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.AdditionalIdentificationRequired }],
      })
    })

    it('should keep a completed photo ID as the one a non-photo card needs when the card is the second ID', async () => {
      const scanner = renderScanner(BCSCCardProcess.BCSCNonPhoto, [completedId(passport), cardBeingCaptured])

      await scanner.handleScanBarcodes('S00023254', mockLicense, driversLicence)

      expect(scanner.mockRemoveEvidenceByType).toHaveBeenCalledWith(driversLicence)
      expect(scanner.mockClearAdditionalEvidence).not.toHaveBeenCalled()
      // The passport completes the ID step, and the authorization supplied a verified email
      expect(scanner.mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationMethodSelection }],
      })
    })

    it('should still ask a non-photo card for a photo ID when the completed first ID has none', async () => {
      const scanner = renderScanner(BCSCCardProcess.BCSCNonPhoto, [completedId(birthCertificate), cardBeingCaptured])

      await scanner.handleScanBarcodes('S00023254', mockLicense, driversLicence)

      expect(scanner.mockRemoveEvidenceByType).toHaveBeenCalledWith(driversLicence)
      expect(scanner.mockClearAdditionalEvidence).not.toHaveBeenCalled()
      expect(scanner.mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.AdditionalIdentificationRequired }],
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

  describe('codeTypes', () => {
    it('keeps the same array when a store update rebuilds the scanner, so the camera keeps its scanner output', () => {
      jest.mocked(useAuthorizationService).mockReturnValue({} as any)
      jest.mocked(useSecureActions).mockReturnValue({} as any)
      jest.mocked(Bifold).useServices.mockReturnValue([{ debug: jest.fn() } as any])
      jest.mocked(Bifold).useStore.mockReturnValue([{ bcsc: {}, bcscSecure: {} } as any, mockDispatch])

      const hook = renderHook(() => useCardScanner())
      const first = hook.result.current

      jest.mocked(Bifold).useStore.mockReturnValue([{ bcsc: {}, bcscSecure: {} } as any, mockDispatch])
      hook.rerender({})

      expect(hook.result.current).not.toBe(first)
      expect(hook.result.current.codeTypes).toBe(first.codeTypes)
    })
  })
})
