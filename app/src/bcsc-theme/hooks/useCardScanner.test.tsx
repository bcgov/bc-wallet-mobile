import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import * as Bifold from '@bifold/core'
import * as navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'

const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"
const BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

jest.mock('@/bcsc-theme/api/hooks/useApi')
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
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
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

      useApiMock.mockReturnValue(mockAuthorization)
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
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
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

      useApiMock.mockReturnValue(mockAuthorization)
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
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
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

      useApiMock.mockReturnValue(mockAuthorization)
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
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
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

      useApiMock.mockReturnValue(mockAuthorization)
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
  })

  describe('handleScanComboCard', () => {
    it('should dispatch actions and navigate on successful device authorization', async () => {
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
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

      useApiMock.mockReturnValue(mockAuthorization)
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
        routes: [{ name: BCSCScreens.SetupSteps }],
      })
    })

    it('should throw error if license birthdate is invalid', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }

      useApiMock.mockReturnValue(mockAuthorization)
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
      const useApiMock = jest.mocked(useApi)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }

      useApiMock.mockReturnValue(mockAuthorization)
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

    it('should dispatch mismatched serial on failure', async () => {
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
      const mockUpdateUserInfo = jest.fn()
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn().mockRejectedValue(new Error('Authorization failed')),
        },
      }
      const mockNavigationReset = jest.fn()

      useApiMock.mockReturnValue(mockAuthorization)
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
      bifoldMock.useServices.mockReturnValue([{ debug: jest.fn(), error: jest.fn() } as any])

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
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.MismatchedSerial }],
      })
    })
  })

  describe('handleScanBCServicesCard', () => {
    it('should dispatch actions and navigate to EnterBirthdate screen', async () => {
      const useApiMock = jest.mocked(useApi)
      const bifoldMock = jest.mocked(Bifold)
      const navigationMock = jest.mocked(navigation)
      const useSecureActionsMock = jest.mocked(useSecureActions)

      const mockState: any = {}
      const mockUpdateUserInfo = jest.fn()
      const mockAuthorization: any = {
        authorization: {
          authorizeDevice: jest.fn(),
        },
      }
      const mockNavigationReset = jest.fn()

      useApiMock.mockReturnValue(mockAuthorization)
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
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EnterBirthdate }],
      })
    })
  })
})
