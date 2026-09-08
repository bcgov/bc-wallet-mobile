import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { AccountSetupType } from '@/store'
import * as Bifold from '@bifold/core'
import * as navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'

const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"
const BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

jest.mock('@/bcsc-theme/services/hooks/useAuthorizationService')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@react-navigation/native')
jest.mock('@bifold/core')

const mockDispatch = jest.fn() // unused atp

describe('useCardScanner', () => {
  beforeEach(() => {
    jest.resetAllMocks()
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
        value: BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
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
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
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
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
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
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
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
})
